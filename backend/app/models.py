import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import relationship
from .database import Base


class AudioProject(Base):
    __tablename__ = "audio_projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    audio_file_path = Column(String(512), nullable=True)
    duration = Column(Float, default=0.0)
    file_size = Column(BigInteger, default=0)
    file_type = Column(String(10), default="wav")
    status = Column(String(20), default="processing")
    bpm = Column(Integer, default=120)
    time_signature = Column(Integer, default=4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chords = relationship(
        "ChordPrediction", back_populates="project", cascade="all, delete-orphan"
    )
    waveform = relationship(
        "WaveformData", back_populates="project", cascade="all, delete-orphan"
    )

    @property
    def duration_formatted(self) -> str:
        mins = int(self.duration // 60)
        secs = int(self.duration % 60)
        return f"{mins}:{secs:02d}"

    @property
    def file_size_formatted(self) -> str:
        if self.file_size > 1024 * 1024:
            return f"{self.file_size / (1024 * 1024):.1f} MB"
        return f"{self.file_size / 1024:.1f} KB"


class ChordPrediction(Base):
    __tablename__ = "chord_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(
        String(36), ForeignKey("audio_projects.id", ondelete="CASCADE"), nullable=False
    )
    timestamp = Column(Float, nullable=False)
    chord = Column(String(20), nullable=False)
    confidence = Column(Float, nullable=False)

    project = relationship("AudioProject", back_populates="chords")

    @property
    def formatted_time(self) -> str:
        mins = int(self.timestamp // 60)
        secs = int(self.timestamp % 60)
        return f"{mins}:{secs:02d}"


class WaveformData(Base):
    __tablename__ = "waveform_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(
        String(36), ForeignKey("audio_projects.id", ondelete="CASCADE"), nullable=False
    )
    time = Column(Float, nullable=False)
    amplitude = Column(Float, nullable=False)

    project = relationship("AudioProject", back_populates="waveform")
