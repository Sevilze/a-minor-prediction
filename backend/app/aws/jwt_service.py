from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import jwt

from .models import AuthUser, JWTClaims


class JWTError(Exception):
    pass


class JWTService:
    def __init__(self, secret: str, algorithm: str = "HS256"):
        self.secret = secret
        self.algorithm = algorithm

    def generate_token(self, user: AuthUser, expires_hours: int = 24) -> str:
        now = datetime.utcnow()
        expiration = now + timedelta(hours=expires_hours)
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "name": user.name,
            "exp": int(expiration.timestamp()),
            "iat": int(now.timestamp()),
        }
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)

    def verify_token(self, token: str) -> JWTClaims:
        if not token:
            raise JWTError("Empty token")
        parts = token.split(".")
        if len(parts) != 3:
            raise JWTError("Invalid token format")
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            return JWTClaims(
                sub=payload["sub"],
                email=payload["email"],
                name=payload["name"],
                exp=payload["exp"],
                iat=payload["iat"],
            )
        except jwt.ExpiredSignatureError:
            raise JWTError("Token expired")
        except jwt.InvalidTokenError as e:
            raise JWTError(f"Invalid token: {e}")

    def refresh_token(self, user: AuthUser) -> str:
        return self.generate_token(user)

    def get_user_id_from_token(self, token: str) -> Optional[UUID]:
        try:
            claims = self.verify_token(token)
            return UUID(claims.sub)
        except (JWTError, ValueError):
            return None
