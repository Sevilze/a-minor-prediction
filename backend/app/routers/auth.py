import logging
import secrets
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from ..aws.cognito_service import CognitoService, CognitoError
from ..aws.dynamodb_repository import DynamoDbRepository, RepositoryError
from ..aws.jwt_service import JWTService
from ..aws.models import User, AuthUser
from ..aws.auth_middleware import AuthenticatedUser, OptionalUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


class AuthResponse(BaseModel):
    token: str
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def get_cognito_service(request: Request) -> CognitoService:
    return request.app.state.cognito_service


def get_db_repo(request: Request) -> DynamoDbRepository:
    return request.app.state.db_repo


def get_jwt_service(request: Request) -> JWTService:
    return request.app.state.jwt_service


@router.get("/login")
async def login_redirect(
    request: Request,
    cognito_service: CognitoService = Depends(get_cognito_service),
) -> RedirectResponse:
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    auth_url = cognito_service.get_authorization_url(state)
    logger.info(f"Redirecting to Cognito login: {auth_url}")
    return RedirectResponse(url=auth_url)


@router.get("/cognito/callback")
async def cognito_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    cognito_service: CognitoService = Depends(get_cognito_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> RedirectResponse:
    if error:
        logger.error(f"OAuth error: {error} - {error_description}")
        raise HTTPException(status_code=400, detail=error_description or error)

    stored_state = request.session.get("oauth_state")
    if not stored_state or stored_state != state:
        logger.warning("OAuth state mismatch")
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        tokens = await cognito_service.exchange_code_for_tokens(code)
        user_info = await cognito_service.get_user_info(tokens.access_token)
        logger.info(f"User authenticated: {user_info.email}")

        existing_user = await db_repo.get_user_by_cognito_sub(user_info.sub)
        if existing_user:
            existing_user.cognito_access_token = tokens.access_token
            existing_user.cognito_refresh_token = tokens.refresh_token
            existing_user.last_login = datetime.utcnow()
            existing_user.updated_at = datetime.utcnow()
            await db_repo.update_user(existing_user)
            user = existing_user
            logger.info(f"Updated existing user: {user.email}")
        else:
            name = (
                " ".join(filter(None, [user_info.given_name, user_info.family_name]))
                or user_info.email.split("@")[0]
            )
            user = User(
                id=uuid4(),
                cognito_sub=user_info.sub,
                email=user_info.email,
                name=name,
                cognito_access_token=tokens.access_token,
                cognito_refresh_token=tokens.refresh_token,
                picture_url=user_info.picture,
                last_login=datetime.utcnow(),
            )
            await db_repo.create_user(user)
            logger.info(f"Created new user: {user.email}")

        auth_user = AuthUser.from_user(user)
        jwt_token = jwt_service.generate_token(auth_user)
        frontend_url = request.app.state.settings.frontend_url
        redirect_url = f"{frontend_url}?token={jwt_token}"
        return RedirectResponse(url=redirect_url)

    except CognitoError as e:
        logger.error(f"Cognito error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/me")
async def get_current_user(
    request: Request,
    user_id: AuthenticatedUser,
    db_repo: DynamoDbRepository = Depends(get_db_repo),
) -> dict:
    try:
        user = await db_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "picture_url": user.picture_url,
        }
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.post("/refresh")
async def refresh_tokens(
    request: Request,
    refresh_request: RefreshRequest,
    user_id: AuthenticatedUser,
    cognito_service: CognitoService = Depends(get_cognito_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> TokenResponse:
    try:
        user = await db_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        tokens = await cognito_service.refresh_token(refresh_request.refresh_token)
        user.cognito_access_token = tokens.access_token
        if tokens.refresh_token:
            user.cognito_refresh_token = tokens.refresh_token
        user.updated_at = datetime.utcnow()
        await db_repo.update_user(user)

        auth_user = AuthUser.from_user(user)
        jwt_token = jwt_service.generate_token(auth_user)
        return TokenResponse(access_token=jwt_token)

    except CognitoError as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(status_code=401, detail="Token refresh failed")
    except RepositoryError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.post("/logout")
async def logout(
    request: Request,
    user_id: OptionalUser,
    cognito_service: CognitoService = Depends(get_cognito_service),
    db_repo: DynamoDbRepository = Depends(get_db_repo),
) -> dict:
    if not user_id:
        return {"message": "Already logged out"}

    try:
        user = await db_repo.get_user_by_id(user_id)
        if user and user.cognito_access_token:
            try:
                await cognito_service.revoke_token(user.cognito_access_token)
            except CognitoError:
                pass
            user.cognito_access_token = None
            user.cognito_refresh_token = None
            user.updated_at = datetime.utcnow()
            await db_repo.update_user(user)
        return {"message": "Logged out successfully"}

    except RepositoryError as e:
        logger.error(f"Database error during logout: {e}")
        return {"message": "Logged out"}
