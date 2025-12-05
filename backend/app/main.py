import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .aws.cognito_service import CognitoService
from .aws.dynamodb_repository import DynamoDbRepository
from .aws.jwt_service import JWTService
from .aws.s3_service import S3Service
from .config import get_settings
from .preprocessing.predictor import load_model
from .routers.audio import router as audio_router
from .routers.auth import router as auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings

    app.state.s3_service = S3Service(
        bucket_name=settings.s3_bucket_name,
        region=settings.aws_region,
    )

    app.state.db_repo = DynamoDbRepository(
        users_table=settings.dynamodb_users_table,
        tracks_table=settings.dynamodb_tracks_table,
        predictions_table=settings.dynamodb_predictions_table,
        playlists_table=settings.dynamodb_playlists_table,
        region=settings.aws_region,
    )

    app.state.jwt_service = JWTService(secret=settings.jwt_secret)

    if settings.cognito_configured:
        app.state.cognito_service = CognitoService(
            user_pool_id=settings.cognito_user_pool_id,
            client_id=settings.cognito_client_id,
            client_secret=settings.cognito_client_secret,
            domain=settings.cognito_domain,
            redirect_uri=settings.cognito_redirect_uri,
            region=settings.aws_region,
        )
        logger.info("Cognito authentication configured")
    else:
        app.state.cognito_service = None
        logger.warning(
            "Cognito not configured. Set COGNITO_* environment variables to enable OAuth."
        )

    load_model()
    logger.info("ML model loaded")

    yield

    if app.state.cognito_service:
        await app.state.cognito_service.close()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Chord classification API for audio files with AWS integration",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

is_localhost = "localhost" in settings.base_url or "127.0.0.1" in settings.base_url
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,
    same_site="lax",
    https_only=not is_localhost,
)

app.include_router(audio_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to ChordAI API",
        "docs": "/docs",
        "health": "/api/health",
        "version": "2.0.0",
    }
