import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from ..aws.auth_middleware import AuthenticatedUser
from ..aws.dynamodb_repository import DynamoDbRepository, RepositoryError
from ..aws.models import (
    AudioTrackEntry,
    ChordPrediction,
    ChordPredictionEntry,
    PlaylistEntry,
)
from ..aws.s3_service import S3Service, S3ServiceError
from ..config import get_settings
from ..preprocessing.feature_extractor import (
    AudioFeatureExtractor,
    estimate_bpm,
    get_audio_duration,
)
from ..preprocessing.predictor import get_predictor
from ..schemas import (
    ChordPredictionSchema,
    CreatePlaylistRequest,
    HealthResponse,
    PlaylistBase,
    PlaylistListItem,
    PlaylistListResponse,
    PlaylistResponse,
    SuccessResponse,
    TrackBase,
    TrackListItem,
    TrackResponse,
    UpdatePlaylistRequest,
    UploadResponse,
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
    playlist_id: str = Form(None),
    user_id: AuthenticatedUser = None,
    s3_service: S3Service = Depends(get_s3_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Supported: {', '.join(settings.allowed_extensions)}",
        )

    track_id = str(uuid.uuid4())
    file_ext = get_file_extension(file.filename)
    mime_type = get_mime_type(file_ext)

    try:
        content = await file.read()
        file_size = len(content)
        file_hash = S3Service.calculate_file_hash(content)
        s3_key = S3Service.generate_s3_key(str(user_id), file_hash, file_ext)
        s3_bucket = request.app.state.settings.s3_bucket_name

        await s3_service.upload_file(content, s3_key, mime_type)

        track = AudioTrackEntry(
            id=track_id,
            user_id=str(user_id),
            playlist_id=playlist_id,
            name=file.filename,
            s3_key=s3_key,
            s3_bucket=s3_bucket,
            file_hash=file_hash,
            file_size=file_size,
            file_type=file_ext,
            status="processing",
        )
        await db_repo.create_track(track)

        extractor = AudioFeatureExtractor()
        audio, sr = extractor.load_audio_from_bytes(content)
        duration = get_audio_duration(audio)
        bpm = estimate_bpm(audio)

        track.duration = duration
        track.bpm = bpm
        track.status = "completed"
        await db_repo.update_track(track)

        predictor = get_predictor()
        chord_predictions = predictor.predict_audio(audio, hop_duration=2.0)

        chord_list = [
            ChordPrediction(
                timestamp=float(pred["timestamp"]),
                chord=pred["chord"],
                confidence=float(pred["confidence"]),
            )
            for pred in chord_predictions
        ]
        chord_entry = ChordPredictionEntry(
            track_id=track_id,
            chords=chord_list,
        )
        await db_repo.create_predictions(chord_entry)

        return UploadResponse(
            success=True,
            track=TrackBase(
                id=track.id,
                name=track.name,
                duration=track.duration_formatted,
                duration_seconds=track.duration,
                size=track.file_size_formatted,
                status=track.status,
                type=track.file_type,
                bpm=track.bpm,
                time_signature=track.time_signature,
                playlist_id=playlist_id,
            ),
            chords=[
                ChordPredictionSchema(
                    timestamp=c.timestamp,
                    formatted_time=c.formatted_time,
                    chord=c.chord,
                    confidence=c.confidence,
                )
                for c in chord_list
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


@router.get("/audio/{track_id}")
async def get_audio_file(
    track_id: str,
    user_id: AuthenticatedUser,
    s3_service: S3Service = Depends(get_s3_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        track = await db_repo.get_track_by_id(track_id)
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        if track.user_id != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")

        url = await s3_service.generate_presigned_url(track.s3_key)
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


@router.post("/playlists", response_model=PlaylistResponse)
async def create_playlist(
    request_body: CreatePlaylistRequest,
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        playlist_id = str(uuid.uuid4())
        playlist = PlaylistEntry(
            id=playlist_id,
            user_id=str(user_id),
            name=request_body.name,
            description=request_body.description,
            track_ids=[],
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        await db_repo.create_playlist(playlist)

        return PlaylistResponse(
            success=True,
            playlist=PlaylistBase(
                id=playlist.id,
                name=playlist.name,
                description=playlist.description,
                track_count=0,
                created_at=playlist.created_at,
                updated_at=playlist.updated_at,
            ),
            tracks=[],
        )
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/playlists", response_model=PlaylistListResponse)
async def list_playlists(
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        playlists = await db_repo.get_user_playlists(user_id)
        playlists.sort(key=lambda p: p.updated_at, reverse=True)

        return PlaylistListResponse(
            success=True,
            playlists=[
                PlaylistListItem(
                    id=p.id,
                    name=p.name,
                    track_count=len(p.track_ids),
                    updated_at=p.updated_at,
                )
                for p in playlists
            ],
        )
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: str,
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        playlist = await db_repo.get_playlist_by_id(playlist_id)
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        if playlist.user_id != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")

        tracks = await db_repo.get_playlist_tracks(playlist_id)

        return PlaylistResponse(
            success=True,
            playlist=PlaylistBase(
                id=playlist.id,
                name=playlist.name,
                description=playlist.description,
                track_count=len(playlist.track_ids),
                created_at=playlist.created_at,
                updated_at=playlist.updated_at,
            ),
            tracks=[
                TrackListItem(
                    id=t.id,
                    name=t.name,
                    duration=t.duration_formatted,
                    status=t.status,
                )
                for t in tracks
            ],
        )
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.put("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: str,
    request_body: UpdatePlaylistRequest,
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        playlist = await db_repo.get_playlist_by_id(playlist_id)
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        if playlist.user_id != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")

        if request_body.name is not None:
            playlist.name = request_body.name
        if request_body.description is not None:
            playlist.description = request_body.description
        if request_body.track_ids is not None:
            playlist.track_ids = request_body.track_ids

        playlist.updated_at = datetime.utcnow().isoformat()
        await db_repo.update_playlist(playlist)

        tracks = await db_repo.get_playlist_tracks(playlist_id)

        return PlaylistResponse(
            success=True,
            playlist=PlaylistBase(
                id=playlist.id,
                name=playlist.name,
                description=playlist.description,
                track_count=len(playlist.track_ids),
                created_at=playlist.created_at,
                updated_at=playlist.updated_at,
            ),
            tracks=[
                TrackListItem(
                    id=t.id,
                    name=t.name,
                    duration=t.duration_formatted,
                    status=t.status,
                )
                for t in tracks
            ],
        )
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/playlists/{playlist_id}", response_model=SuccessResponse)
async def delete_playlist(
    playlist_id: str,
    user_id: AuthenticatedUser,
    s3_service: S3Service = Depends(get_s3_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        playlist = await db_repo.get_playlist_by_id(playlist_id)
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        if playlist.user_id != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")

        tracks = await db_repo.get_playlist_tracks(playlist_id)
        for track in tracks:
            try:
                await s3_service.delete_file(track.s3_key)
            except S3ServiceError:
                logger.warning(f"Failed to delete S3 file for track {track.id}")
            await db_repo.delete_track_predictions(track.id)
            await db_repo.delete_track(track.id)

        await db_repo.delete_playlist(playlist_id)

        return SuccessResponse(success=True)
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: str,
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        track = await db_repo.get_track_by_id(track_id)
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        if track.user_id != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")

        chord_entry = await db_repo.get_track_predictions(track_id)
        chords = chord_entry.chords if chord_entry else []

        return TrackResponse(
            success=True,
            track=TrackBase(
                id=track.id,
                name=track.name,
                duration=track.duration_formatted,
                duration_seconds=track.duration,
                size=track.file_size_formatted,
                status=track.status,
                type=track.file_type,
                bpm=track.bpm,
                time_signature=track.time_signature,
                playlist_id=getattr(track, "playlist_id", None),
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
        )
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/tracks/{track_id}", response_model=SuccessResponse)
async def delete_track(
    track_id: str,
    user_id: AuthenticatedUser,
    s3_service: S3Service = Depends(get_s3_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
):
    try:
        track = await db_repo.get_track_by_id(track_id)
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        if track.user_id != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")

        playlist_id = getattr(track, "playlist_id", None)
        if playlist_id:
            playlist = await db_repo.get_playlist_by_id(playlist_id)
            if playlist and track_id in playlist.track_ids:
                playlist.track_ids.remove(track_id)
                playlist.updated_at = datetime.utcnow().isoformat()
                await db_repo.update_playlist(playlist)

        await s3_service.delete_file(track.s3_key)
        await db_repo.delete_track_predictions(track_id)
        await db_repo.delete_track(track_id)

        return SuccessResponse(success=True)
    except S3ServiceError as e:
        logger.error(f"S3 delete error: {e}")
        raise HTTPException(status_code=500, detail="Storage error")
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")
