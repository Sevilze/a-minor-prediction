from .auth_middleware import (
    AuthenticatedUser,
    OptionalUser,
    optional_auth,
    require_auth,
)
from .cognito_service import CognitoError, CognitoService
from .dynamodb_repository import DynamoDbRepository, RepositoryError
from .jwt_service import JWTError, JWTService
from .models import (
    AudioTrackEntry,
    AuthUser,
    ChordPredictionEntry,
    JWTClaims,
    User,
)
from .s3_service import S3Service, S3ServiceError

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
    "AudioTrackEntry",
    "ChordPredictionEntry",
    "AuthUser",
    "JWTClaims",
]
