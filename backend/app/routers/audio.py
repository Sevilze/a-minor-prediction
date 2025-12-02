import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File

from ..aws.s3_service import S3Service, S3ServiceError
from ..aws.dynamodb_repository import DynamoDbRepository, RepositoryError
from ..aws.models import AudioProjectEntry, ChordPredictionEntry, WaveformDataEntry
from ..aws.auth_middleware import AuthenticatedUser
from ..config import get_settings
from ..preprocessing.predictor import get_predictor
from ..preprocessing.feature_extractor import (
    AudioFeatureExtractor,
    get_audio_duration,
    generate_waveform_data,
    estimate_bpm,
)
from ..schemas import (
    ProjectResponse,
    ProjectListResponse,
    UploadResponse,
    SuccessResponse,
    HealthResponse,
    ProjectBase,
    ProjectListItem,
    ChordPredictionSchema,
    WaveformDataSchema,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["audio"])
settings = get_settings()


def get_s3_service(request: Request) -> S3Service:
    return request.app.state.s3_service


def get_db_repo(request: Request) -> DynamoDbRepository:
    return request.app.state.db_repo


def allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in settings.allowed_extensions
    )


def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[1].lower() if "." in filename else "wav"


def get_mime_type(extension: str) -> str:
    mime_types = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "flac": "audio/flac",
        "aiff": "audio/aiff",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
    }
    return mime_types.get(extension, "application/octet-stream")


@router.post("/upload", response_model=UploadResponse)
async def upload_audio(
    request: Request,
    file: UploadFile = File(...),
    user_id: AuthenticatedUser = None,
    s3_service: S3Service = Depends(get_s3_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f'File type not allowed. Supported: {", ".join(settings.allowed_extensions)}',
        )

    project_id = str(uuid.uuid4())
    file_ext = get_file_extension(file.filename)
    mime_type = get_mime_type(file_ext)

    try:
        content = await file.read()
        file_size = len(content)
        file_hash = S3Service.calculate_file_hash(content)
        s3_key = S3Service.generate_s3_key(user_id, file_hash, file_ext)
        s3_bucket = request.app.state.settings.s3_bucket_name

        await s3_service.upload_file(content, s3_key, mime_type)

        project = AudioProjectEntry(
            id=project_id,
            user_id=user_id,
            name=file.filename,
            s3_key=s3_key,
            s3_bucket=s3_bucket,
            file_hash=file_hash,
            file_size=file_size,
            file_type=file_ext,
            status="processing",
        )
        await db_repo.create_project(project)

        extractor = AudioFeatureExtractor()
        audio, sr = extractor.load_audio_from_bytes(content)
        duration = get_audio_duration(audio)
        bpm = estimate_bpm(audio)

        project.duration = duration
        project.bpm = bpm
        project.status = "completed"
        await db_repo.update_project(project)

        predictor = get_predictor()
        chord_predictions = predictor.predict_audio(audio, hop_duration=2.0)

        chord_entries = [
            ChordPredictionEntry(
                project_id=project_id,
                timestamp=float(pred["timestamp"]),
                chord=pred["chord"],
                confidence=float(pred["confidence"]),
            )
            for pred in chord_predictions
        ]
        await db_repo.create_chord_predictions(chord_entries)

        waveform_data = generate_waveform_data(
            audio, num_points=min(300, int(duration * 3))
        )
        waveform_entries = [
            WaveformDataEntry(
                project_id=project_id,
                time=float(point["time"]),
                amplitude=float(point["amplitude"]),
            )
            for point in waveform_data
        ]
        await db_repo.create_waveform_data(waveform_entries)

        return UploadResponse(
            success=True,
            project=ProjectBase(
                id=project.id,
                name=project.name,
                duration=project.duration_formatted,
                duration_seconds=project.duration,
                size=project.file_size_formatted,
                status=project.status,
                type=project.file_type,
                bpm=project.bpm,
                time_signature=project.time_signature,
            ),
            chords=[
                ChordPredictionSchema(
                    timestamp=c.timestamp,
                    formatted_time=c.formatted_time,
                    chord=c.chord,
                    confidence=c.confidence,
                )
                for c in chord_entries
            ],
            waveform=[
                WaveformDataSchema(time=w.time, amplitude=w.amplitude)
                for w in waveform_entries
            ],
        )

    except S3ServiceError as e:
        logger.error(f"S3 upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Storage error: {e}")
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        project = await db_repo.get_project_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        chords = await db_repo.get_project_chords(project_id)
        waveform = await db_repo.get_project_waveform(project_id)

        return ProjectResponse(
            success=True,
            project=ProjectBase(
                id=project.id,
                name=project.name,
                duration=project.duration_formatted,
                duration_seconds=project.duration,
                size=project.file_size_formatted,
                status=project.status,
                type=project.file_type,
                bpm=project.bpm,
                time_signature=project.time_signature,
            ),
            chords=[
                ChordPredictionSchema(
                    timestamp=c.timestamp,
                    formatted_time=c.formatted_time,
                    chord=c.chord,
                    confidence=c.confidence,
                )
                for c in chords
            ],
            waveform=[
                WaveformDataSchema(time=w.time, amplitude=w.amplitude) for w in waveform
            ],
        )
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/project/{project_id}", response_model=SuccessResponse)
async def delete_project(
    project_id: str,
    user_id: AuthenticatedUser,
    s3_service: S3Service = Depends(get_s3_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        project = await db_repo.get_project_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        await s3_service.delete_file(project.s3_key)
        await db_repo.delete_project_chords(project_id)
        await db_repo.delete_project_waveform(project_id)
        await db_repo.delete_project(project_id)

        return SuccessResponse(success=True)
    except S3ServiceError as e:
        logger.error(f"S3 delete error: {e}")
        raise HTTPException(status_code=500, detail="Storage error")
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        projects = await db_repo.get_user_projects(user_id)
        projects.sort(key=lambda p: p.created_at, reverse=True)

        return ProjectListResponse(
            success=True,
            projects=[
                ProjectListItem(
                    id=p.id,
                    name=p.name,
                    duration=p.duration_formatted,
                    size=p.file_size_formatted,
                    status=p.status,
                    type=p.file_type,
                )
                for p in projects
            ],
        )
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/audio/{project_id}")
async def get_audio_file(
    project_id: str,
    user_id: AuthenticatedUser,
    s3_service: S3Service = Depends(get_s3_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        project = await db_repo.get_project_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        url = await s3_service.generate_presigned_url(project.s3_key)
        return {"url": url}
    except S3ServiceError as e:
        logger.error(f"S3 error: {e}")
        raise HTTPException(status_code=500, detail="Storage error")
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    model_exists = settings.model_checkpoint_path.exists()
    return HealthResponse(
        status="ok",
        model_status="loaded" if model_exists else "demo",
        model_exists=model_exists,
    )
