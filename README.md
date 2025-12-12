# ChordAI

ChordAI is a polyphonic chord progression classification system powered by a Convolutional Recurrent Neural Network (CRNN). The application provides automatic chord recognition from audio files, returning timestamped chord predictions with confidence scores. It features a modern React frontend and a FastAPI backend with AWS cloud integrations for authentication and data persistence.

## Project Structure

```text
chordai/
│
├── backend/                           # FastAPI backend service
│   ├── app/
│   │   ├── aws/                       # AWS service integrations
│   │   │   ├── cognito_service.py         - Cognito OAuth authentication
│   │   │   ├── dynamodb_repository.py     - DynamoDB data access layer
│   │   │   ├── jwt_service.py             - JWT token handling
│   │   │   ├── models.py                  - Database entity models
│   │   │   └── s3_service.py              - S3 file storage operations
│   │   │
│   │   ├── preprocessing/             # Audio processing and ML inference
│   │   │   ├── feature_extractor.py       - Mel spectrogram extraction
│   │   │   ├── model.py                   - ChordCRNN architecture definition
│   │   │   ├── predictor.py               - Model inference pipeline
│   │   │   └── vocabulary.py              - Chord label encoding/decoding
│   │   │
│   │   ├── routers/                   # API endpoint definitions
│   │   │   ├── audio.py                   - Audio upload and prediction endpoints
│   │   │   └── auth.py                    - Authentication endpoints
│   │   │
│   │   ├── config.py                      - Application configuration
│   │   ├── main.py                        - FastAPI application entry point
│   │   └── schemas.py                     - Pydantic request/response models
│   │
│   ├── Dockerfile                         - Container image definition
│   ├── requirements.txt                   - Python dependencies
│   └── run_http2.py                       - HTTP/2 server with Hypercorn
│
├── src/                               # React frontend application
│   ├── components/
│   │   ├── audio/                     # Audio playback components
│   │   │   ├── AudioPlayer.tsx            - Main audio player with controls
│   │   │   ├── ChordStrip.tsx             - Chord timeline visualization
│   │   │   └── WaveformDisplay.tsx        - Audio waveform renderer
│   │   ├── layout/                    # Layout components
│   │   ├── playlist/                  # Playlist management components
│   │   └── ui/                        # Reusable UI primitives
│   │
│   ├── hooks/                         # Custom React hooks
│   │   └── useAudioPlayer.ts              - Audio playback state management
│   │
│   ├── services/                      # API client services
│   │   ├── api.ts                         - Backend API client
│   │   └── auth.ts                        - Authentication service
│   │
│   ├── types/                         # TypeScript type definitions
│   ├── utils/                         # Utility functions
│   │   ├── format.ts                      - Time/string formatting
│   │   └── waveform.ts                    - Waveform data processing
│   │
│   ├── App.tsx                            - Main application component
│   └── index.tsx                          - Application entry point
│
├── trainingpipeline/                  # Model training resources
│   ├── Dockerfile.models                  - Model container
│   ├── best_model.pt                      - Trained model checkpoint
│   └── checkpoints/                       - Training checkpoints and vocabulary
│
├── .github/workflows/                 # GitHub Actions CI/CD
│   ├── backend-cicd.yml                   - Backend build and deploy
│   └── frontend-cicd.yml                  - Frontend build and deploy
│
├── index.html                             - Frontend entry point
├── package.json                           - Node.js dependencies
├── vite.config.ts                         - Vite build configuration
└── tsconfig.json                          - TypeScript configuration
```

## Implementation Details

The core of ChordAI is a CRNN architecture that processes Mel spectrograms extracted from audio files. The model consists of four convolutional blocks for hierarchical spectral feature extraction, a bidirectional GRU layer for temporal sequence modeling, and an attention mechanism for focused aggregation. The network classifies audio segments into 97 chord classes covering major, minor, diminished, augmented, and seventh chord variations across all 12 root notes.

The backend is built with FastAPI and uses Hypercorn as the ASGI server with HTTP/2 support. Audio files are stored in Amazon S3 while user data, tracks, playlists, and prediction results are persisted in Amazon DynamoDB. Authentication is handled through Amazon Cognito with OAuth 2.0 flow. The preprocessing pipeline uses librosa for audio loading and Mel spectrogram computation with parameters of 22050 Hz sample rate, 2048-sample FFT window, 512-sample hop length, and 128 Mel bands.

The frontend is a React application written in TypeScript and bundled with Vite. It provides an interface for uploading audio files, viewing chord predictions synchronized with audio playback, and managing playlists of analyzed tracks.

## Running Locally

Prerequisites include Node.js (v18+), Bun or npm, Python 3.11+, and FFmpeg. Start by cloning the repository and installing dependencies for both frontend and backend.

For the frontend, install dependencies with `bun install` and run the development server with `bun run dev`. The application will be available at `http://localhost:3000`.

For the backend, create a Python virtual environment, install dependencies with `pip install -r requirements.txt`, configure environment variables in `.env` (AWS credentials, model paths, etc.), and run the server with `python run_http2.py`. The API will be available at `http://localhost:8080`. Environment variables required include AWS_REGION, S3_BUCKET_NAME, DYNAMODB_USERS_TABLE, DYNAMODB_TRACKS_TABLE, DYNAMODB_PREDICTIONS_TABLE, DYNAMODB_PLAYLISTS_TABLE, MODEL_CHECKPOINT_PATH, and VOCAB_PATH. Cognito-related variables are optional but required for OAuth authentication.

## Deployment

The application is deployed on Google Cloud Platform using GitHub Actions for continuous integration and deployment. Both frontend and backend have dedicated CI/CD workflows that trigger on pushes to the main branch when relevant files change.

The backend workflow performs linting with Ruff and type checking before building a Docker image. The image is based on Python 3.11-slim with FFmpeg and libsndfile for audio processing. Model weights are pulled from a separate Docker Hub container and bundled into the final image. The built image is pushed to Google Artifact Registry and deployed to Cloud Run.

The frontend workflow runs TypeScript type checking, builds the React application with Vite, then packages the static assets into an nginx:alpine container. This container is pushed to Artifact Registry and deployed to Cloud Run.

Cloud infrastructure includes Amazon S3 for audio file storage, Amazon DynamoDB for persisting user data, tracks, playlists, and chord predictions, and Amazon Cognito for OAuth 2.0 authentication.

## URLs

The deployed frontend is available at [chordai-frontend](https://chordai-frontend-220848436310.asia-southeast2.run.app) and the deployed backend API documentation can be accessed at [API Documentation](https://chordai-backend-220848436310.asia-southeast2.run.app/docs).

## License

This project is licensed under the MIT License. See the LICENSE file for details.
