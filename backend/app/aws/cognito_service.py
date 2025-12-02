import httpx
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode


class CognitoError(Exception):
    pass


@dataclass
class CognitoTokenResponse:
    access_token: str
    id_token: str
    refresh_token: Optional[str]
    token_type: str
    expires_in: int


@dataclass
class CognitoUserInfo:
    sub: str
    email: str
    email_verified: bool
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    picture: Optional[str] = None


class CognitoService:
    def __init__(
        self,
        user_pool_id: str,
        client_id: str,
        client_secret: str,
        domain: str,
        redirect_uri: str,
        region: str,
    ):
        self.user_pool_id = user_pool_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.domain = domain
        self.redirect_uri = redirect_uri
        self.region = region
        self._http_client = httpx.AsyncClient(timeout=30.0)

    @property
    def base_url(self) -> str:
        return f"https://{self.domain}.auth.{self.region}.amazoncognito.com"

    def get_authorization_url(self, state: str) -> str:
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "email openid profile",
            "state": state,
            "identity_provider": "Google",
        }
        return f"{self.base_url}/oauth2/authorize?{urlencode(params)}"

    async def exchange_code_for_tokens(self, code: str) -> CognitoTokenResponse:
        token_url = f"{self.base_url}/oauth2/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
        }
        try:
            response = await self._http_client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if response.status_code != 200:
                raise CognitoError(f"Token exchange failed: {response.text}")
            token_data = response.json()
            return CognitoTokenResponse(
                access_token=token_data["access_token"],
                id_token=token_data["id_token"],
                refresh_token=token_data.get("refresh_token"),
                token_type=token_data["token_type"],
                expires_in=token_data["expires_in"],
            )
        except httpx.HTTPError as e:
            raise CognitoError(f"HTTP error during token exchange: {e}")

    async def get_user_info(self, access_token: str) -> CognitoUserInfo:
        user_info_url = f"{self.base_url}/oauth2/userInfo"
        try:
            response = await self._http_client.get(
                user_info_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                raise CognitoError(f"User info request failed: {response.text}")
            user_data = response.json()
            email_verified = user_data.get("email_verified", False)
            if isinstance(email_verified, str):
                email_verified = email_verified.lower() == "true"
            return CognitoUserInfo(
                sub=user_data["sub"],
                email=user_data["email"],
                email_verified=email_verified,
                given_name=user_data.get("given_name"),
                family_name=user_data.get("family_name"),
                picture=user_data.get("picture"),
            )
        except httpx.HTTPError as e:
            raise CognitoError(f"HTTP error getting user info: {e}")

    async def refresh_token(self, refresh_token: str) -> CognitoTokenResponse:
        if not refresh_token:
            raise CognitoError("Empty refresh token")
        token_url = f"{self.base_url}/oauth2/token"
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
        }
        try:
            response = await self._http_client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if response.status_code != 200:
                raise CognitoError(f"Token refresh failed: {response.text}")
            token_data = response.json()
            return CognitoTokenResponse(
                access_token=token_data["access_token"],
                id_token=token_data["id_token"],
                refresh_token=token_data.get("refresh_token"),
                token_type=token_data["token_type"],
                expires_in=token_data["expires_in"],
            )
        except httpx.HTTPError as e:
            raise CognitoError(f"HTTP error during token refresh: {e}")

    async def revoke_token(self, token: str) -> None:
        revoke_url = f"{self.base_url}/oauth2/revoke"
        data = {
            "token": token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        try:
            response = await self._http_client.post(
                revoke_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if response.status_code != 200:
                raise CognitoError(f"Token revocation failed: {response.text}")
        except httpx.HTTPError as e:
            raise CognitoError(f"HTTP error during token revocation: {e}")

    async def close(self) -> None:
        await self._http_client.aclose()
