from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ChordAI"
    debug: bool = False

    aws_region: str
    s3_bucket_name: str
    dynamodb_users_table: str
    dynamodb_tracks_table: str
    dynamodb_predictions_table: str
    dynamodb_playlists_table: str

    cognito_user_pool_id: str
    cognito_client_id: str
    cognito_client_secret: str
    cognito_domain: str
    cognito_redirect_uri: str
    jwt_secret: str

    frontend_url: str
    base_url: str
    cors_origins: str

    max_upload_size: int = 100 * 1024 * 1024
    allowed_extensions: set = {"mp3", "wav", "flac", "aiff", "ogg", "m4a"}

    model_checkpoint_path: Path
    vocab_path: Path

    sample_rate: int = 22050
    hop_length: int = 512
    n_mels: int = 128
    n_fft: int = 2048
    segment_duration: float = 0.5

    ssl_certfile: Optional[str] = None
    ssl_keyfile: Optional[str] = None

    @field_validator("model_checkpoint_path", "vocab_path", mode="before")
    @classmethod
    def parse_path(cls, v):
        if isinstance(v, str):
            return Path(v)
        return

    @property
    def cognito_configured(self) -> bool:
        return bool(
            self.cognito_user_pool_id
            and self.cognito_client_id
            and self.cognito_client_secret
            and self.cognito_domain
        )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
