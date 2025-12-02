import logging
from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .jwt_service import JWTService, JWTError

logger = logging.getLogger(__name__)


class AuthMiddleware:
    def __init__(self, jwt_service: JWTService):
        self.jwt_service = jwt_service
        self._security = HTTPBearer(auto_error=False)

    async def __call__(
        self,
        request: Request,
        credentials: Annotated[
            Optional[HTTPAuthorizationCredentials],
            Depends(HTTPBearer(auto_error=False)),
        ] = None,
    ) -> Optional[UUID]:
        if credentials is None:
            return None
        try:
            claims = self.jwt_service.verify_token(credentials.credentials)
            user_id = UUID(claims.sub)
            request.state.user_id = user_id
            return user_id
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
        except ValueError as e:
            logger.warning(f"Invalid UUID in token: {e}")
            return None


def get_auth_middleware(jwt_service: JWTService) -> AuthMiddleware:
    return AuthMiddleware(jwt_service)


async def require_auth(
    request: Request,
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(HTTPBearer(auto_error=True))
    ],
) -> UUID:
    jwt_service: JWTService = request.app.state.jwt_service
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = jwt_service.verify_token(credentials.credentials)
        user_id = UUID(claims.sub)
        request.state.user_id = user_id
        return user_id
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValueError as e:
        logger.warning(f"Invalid UUID in token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def optional_auth(
    request: Request,
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(HTTPBearer(auto_error=False))
    ] = None,
) -> Optional[UUID]:
    if credentials is None:
        return None
    jwt_service: JWTService = request.app.state.jwt_service
    try:
        claims = jwt_service.verify_token(credentials.credentials)
        user_id = UUID(claims.sub)
        request.state.user_id = user_id
        return user_id
    except (JWTError, ValueError):
        return None


AuthenticatedUser = Annotated[UUID, Depends(require_auth)]
OptionalUser = Annotated[Optional[UUID], Depends(optional_auth)]
