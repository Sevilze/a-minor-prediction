from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .config import get_settings
from .database import init_db
from .routers import audio
from .ml.predictor import load_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    get_settings().upload_dir.mkdir(parents=True, exist_ok=True)
    load_model()
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Chord classification API for audio files",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to ChordAI API",
        "docs": "/docs",
        "health": "/api/health",
    }
