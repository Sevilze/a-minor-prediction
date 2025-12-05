from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID


@dataclass
class User:
    id: UUID
    cognito_sub: str
    email: str
    name: str
    cognito_access_token: Optional[str] = None
    cognito_refresh_token: Optional[str] = None
    picture_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True

    def to_dynamodb_item(self) -> dict[str, Any]:
        item = {
            "id": str(self.id),
            "cognito_sub": self.cognito_sub,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_active": self.is_active,
        }
        if self.cognito_access_token:
            item["cognito_access_token"] = self.cognito_access_token
        if self.cognito_refresh_token:
            item["cognito_refresh_token"] = self.cognito_refresh_token
        if self.picture_url:
            item["picture_url"] = self.picture_url
        if self.last_login:
            item["last_login"] = self.last_login.isoformat()
        return item

    @classmethod
    def from_dynamodb_item(cls, item: dict[str, Any]) -> "User":
        return cls(
            id=UUID(item["id"]),
            cognito_sub=item["cognito_sub"],
            email=item["email"],
            name=item["name"],
            cognito_access_token=item.get("cognito_access_token"),
            cognito_refresh_token=item.get("cognito_refresh_token"),
            picture_url=item.get("picture_url"),
            created_at=datetime.fromisoformat(item["created_at"]),
            updated_at=datetime.fromisoformat(item["updated_at"]),
            last_login=(
                datetime.fromisoformat(item["last_login"])
                if item.get("last_login")
                else None
            ),
            is_active=item.get("is_active", True),
        )


@dataclass
class PlaylistEntry:
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    track_ids: list[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        if not self.updated_at:
            self.updated_at = datetime.utcnow().isoformat()

    def to_dynamodb_item(self) -> dict[str, Any]:
        item = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "track_ids": self.track_ids,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self.description:
            item["description"] = self.description
        return item

    @classmethod
    def from_dynamodb_item(cls, item: dict[str, Any]) -> "PlaylistEntry":
        return cls(
            id=item["id"],
            user_id=item["user_id"],
            name=item["name"],
            description=item.get("description"),
            track_ids=item.get("track_ids", []),
            created_at=item["created_at"],
            updated_at=item["updated_at"],
        )


@dataclass
class AudioTrackEntry:
    id: str
    user_id: str
    playlist_id: Optional[str]
    name: str
    s3_key: str
    s3_bucket: str
    file_hash: str
    file_size: int
    file_type: str
    duration: float = 0.0
    bpm: int = 120
    time_signature: int = 4
    status: str = "processing"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dynamodb_item(self) -> dict[str, Any]:
        item = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "s3_key": self.s3_key,
            "s3_bucket": self.s3_bucket,
            "file_hash": self.file_hash,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "duration": Decimal(str(self.duration)),
            "bpm": self.bpm,
            "time_signature": self.time_signature,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if self.playlist_id:
            item["playlist_id"] = self.playlist_id
        return item

    @classmethod
    def from_dynamodb_item(cls, item: dict[str, Any]) -> "AudioTrackEntry":
        return cls(
            id=item["id"],
            user_id=item["user_id"],
            playlist_id=item.get("playlist_id"),
            name=item["name"],
            s3_key=item["s3_key"],
            s3_bucket=item["s3_bucket"],
            file_hash=item["file_hash"],
            file_size=int(item["file_size"]),
            file_type=item["file_type"],
            duration=float(item.get("duration", 0)),
            bpm=int(item.get("bpm", 120)),
            time_signature=int(item.get("time_signature", 4)),
            status=item.get("status", "processing"),
            created_at=datetime.fromisoformat(item["created_at"]),
            updated_at=datetime.fromisoformat(item["updated_at"]),
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


@dataclass
class ChordPrediction:
    timestamp: float
    chord: str
    confidence: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp": str(self.timestamp),
            "chord": self.chord,
            "confidence": str(self.confidence),
        }

    @classmethod
    def from_dict(cls, item: dict[str, Any]) -> "ChordPrediction":
        return cls(
            timestamp=float(item["timestamp"]),
            chord=item["chord"],
            confidence=float(item["confidence"]),
        )

    @property
    def formatted_time(self) -> str:
        mins = int(self.timestamp // 60)
        secs = int(self.timestamp % 60)
        return f"{mins}:{secs:02d}"


@dataclass
class ChordPredictionEntry:
    track_id: str
    chords: list[ChordPrediction] = field(default_factory=list)

    def to_dynamodb_item(self) -> dict[str, Any]:
        return {
            "track_id": self.track_id,
            "chords": [c.to_dict() for c in self.chords],
        }

    @classmethod
    def from_dynamodb_item(cls, item: dict[str, Any]) -> "ChordPredictionEntry":
        return cls(
            track_id=item["track_id"],
            chords=[ChordPrediction.from_dict(c) for c in item.get("chords", [])],
        )


@dataclass
class AuthUser:
    id: UUID
    email: str
    name: str
    picture_url: Optional[str] = None

    @classmethod
    def from_user(cls, user: User) -> "AuthUser":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            picture_url=user.picture_url,
        )


@dataclass
class JWTClaims:
    sub: str
    email: str
    name: str
    exp: int
    iat: int
