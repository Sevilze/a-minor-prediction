from typing import List

from pydantic import BaseModel


class ChordPredictionSchema(BaseModel):
    timestamp: float
    formatted_time: str
    chord: str
    confidence: float

    class Config:
        from_attributes = True


class WaveformDataSchema(BaseModel):
    time: float
    amplitude: float

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    id: str
    name: str
    duration: str
    duration_seconds: float
    size: str
    status: str
    type: str
    bpm: int
    time_signature: int


class ProjectResponse(BaseModel):
    success: bool
    project: ProjectBase
    chords: List[ChordPredictionSchema]
    waveform: List[WaveformDataSchema]


class ProjectListItem(BaseModel):
    id: str
    name: str
    duration: str
    size: str
    status: str
    type: str


class ProjectListResponse(BaseModel):
    success: bool
    projects: List[ProjectListItem]


class UploadResponse(BaseModel):
    success: bool
    project: ProjectBase
    chords: List[ChordPredictionSchema]
    waveform: List[WaveformDataSchema]


class ErrorResponse(BaseModel):
    error: str


class SuccessResponse(BaseModel):
    success: bool


class HealthResponse(BaseModel):
    status: str
    model_status: str
    model_exists: bool
