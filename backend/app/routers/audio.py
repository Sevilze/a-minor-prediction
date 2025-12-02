import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AudioProject, ChordPrediction, WaveformData
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
from ..config import get_settings
from ..ml.predictor import get_predictor
from ..ml.feature_extractor import (
    AudioFeatureExtractor,
    get_audio_duration,
    generate_waveform_data,
    estimate_bpm,
)

router = APIRouter(prefix="/api", tags=["audio"])
settings = get_settings()


def allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in settings.allowed_extensions
    )


def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[1].lower() if "." in filename else "wav"


@router.post("/upload", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f'File type not allowed. Supported: {", ".join(settings.allowed_extensions)}',
        )

    project_id = str(uuid.uuid4())
    file_ext = get_file_extension(file.filename)

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = settings.upload_dir / f"{project_id}.{file_ext}"

    try:
        content = await file.read()
        file_size = len(content)

        with open(file_path, "wb") as f:
            f.write(content)

        project = AudioProject(
            id=project_id,
            name=file.filename,
            audio_file_path=str(file_path),
            file_size=file_size,
            file_type=file_ext,
            status="processing",
        )
        db.add(project)
        db.commit()

        extractor = AudioFeatureExtractor()
        audio, sr = extractor.load_audio(str(file_path))

        duration = get_audio_duration(audio)
        bpm = estimate_bpm(audio)

        project.duration = duration
        project.bpm = bpm
        project.status = "completed"
        db.commit()

        predictor = get_predictor()
        chord_predictions = predictor.predict_audio(audio, hop_duration=2.0)

        for pred in chord_predictions:
            chord = ChordPrediction(
                project_id=project_id,
                timestamp=pred["timestamp"],
                chord=pred["chord"],
                confidence=pred["confidence"],
            )
            db.add(chord)

        waveform_data = generate_waveform_data(
            audio, num_points=min(300, int(duration * 3))
        )
        for point in waveform_data:
            wf = WaveformData(
                project_id=project_id,
                time=point["time"],
                amplitude=point["amplitude"],
            )
            db.add(wf)

        db.commit()
        db.refresh(project)

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
                for c in project.chords
            ],
            waveform=[
                WaveformDataSchema(time=w.time, amplitude=w.amplitude)
                for w in project.waveform
            ],
        )

    except Exception as e:
        if "project" in locals():
            project.status = "error"
            db.commit()
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(AudioProject).filter(AudioProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
            for c in project.chords
        ],
        waveform=[
            WaveformDataSchema(time=w.time, amplitude=w.amplitude)
            for w in project.waveform
        ],
    )


@router.delete("/project/{project_id}", response_model=SuccessResponse)
async def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(AudioProject).filter(AudioProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.audio_file_path and os.path.exists(project.audio_file_path):
        os.remove(project.audio_file_path)

    db.delete(project)
    db.commit()
    return SuccessResponse(success=True)


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(db: Session = Depends(get_db)):
    projects = db.query(AudioProject).order_by(AudioProject.created_at.desc()).all()
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


@router.get("/health", response_model=HealthResponse)
async def health_check():
    model_exists = settings.model_checkpoint_path.exists()
    return HealthResponse(
        status="ok",
        model_status="loaded" if model_exists else "demo",
        model_exists=model_exists,
    )
