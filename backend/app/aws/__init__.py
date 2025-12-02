from .s3_service import S3Service, S3ServiceError
from .dynamodb_repository import DynamoDbRepository, RepositoryError
from .cognito_service import CognitoService, CognitoError
from .jwt_service import JWTService, JWTError
from .auth_middleware import (
    AuthenticatedUser,
    OptionalUser,
    require_auth,
    optional_auth,
)
from .models import (
    User,
    AudioProjectEntry,
    ChordPredictionEntry,
    WaveformDataEntry,
    AuthUser,
    JWTClaims,
)

__all__ = [
    "S3Service",
    "S3ServiceError",
    "DynamoDbRepository",
    "RepositoryError",
    "CognitoService",
    "CognitoError",
    "JWTService",
    "JWTError",
    "AuthenticatedUser",
    "OptionalUser",
    "require_auth",
    "optional_auth",
    "User",
    "AudioProjectEntry",
    "ChordPredictionEntry",
    "WaveformDataEntry",
    "AuthUser",
    "JWTClaims",
]
