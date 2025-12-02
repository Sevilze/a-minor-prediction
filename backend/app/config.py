from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    app_name: str = "ChordAI"
    debug: bool = True

    database_url: str = "sqlite:///./chordai.db"

    upload_dir: Path = Path("./uploads")
    max_upload_size: int = 100 * 1024 * 1024
    allowed_extensions: set = {"mp3", "wav", "flac", "aiff", "ogg", "m4a"}

    model_checkpoint_path: Path = (
        Path(__file__).resolve().parent.parent.parent
        / "trainingpipeline"
        / "best_model.pt"
    )
    vocab_path: Path = (
        Path(__file__).resolve().parent.parent.parent
        / "trainingpipeline"
        / "checkpoints"
        / "vocab.json"
    )

    sample_rate: int = 22050
    hop_length: int = 512
    n_mels: int = 128
    n_fft: int = 2048
    segment_duration: float = 0.5

    cors_origins: List[str] = ["*"]

    @field_validator("model_checkpoint_path", "vocab_path", "upload_dir", mode="before")
    @classmethod
    def parse_path(cls, v):
        if isinstance(v, str):
            return Path(v)
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
