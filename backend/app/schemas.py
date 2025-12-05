from typing import List, Optional

from pydantic import BaseModel


class ChordPredictionSchema(BaseModel):
    timestamp: float
    formatted_time: str
    chord: str
    confidence: float

    class Config:
        from_attributes = True


class TrackBase(BaseModel):
    id: str
    playlist_id: Optional[str] = None
    name: str
    duration: str
    duration_seconds: float
    size: str
    status: str
    type: str
    bpm: int
    time_signature: int


class TrackResponse(BaseModel):
    success: bool
    track: TrackBase
    chords: List[ChordPredictionSchema]


class TrackListItem(BaseModel):
    id: str
    name: str
    duration: str
    status: str


class PlaylistBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    track_count: int
    created_at: str
    updated_at: str


class PlaylistResponse(BaseModel):
    success: bool
    playlist: PlaylistBase
    tracks: List[TrackListItem]


class PlaylistListItem(BaseModel):
    id: str
    name: str
    track_count: int
    updated_at: str


class PlaylistListResponse(BaseModel):
    success: bool
    playlists: List[PlaylistListItem]


class CreatePlaylistRequest(BaseModel):
    name: str
    description: Optional[str] = None


class UpdatePlaylistRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    track_ids: Optional[List[str]] = None


class UploadResponse(BaseModel):
    success: bool
    track: TrackBase
    chords: List[ChordPredictionSchema]


class ErrorResponse(BaseModel):
    error: str


class SuccessResponse(BaseModel):
    success: bool


class HealthResponse(BaseModel):
    status: str
    model_status: str
    model_exists: bool
