import hashlib
from uuid import UUID

import aioboto3
from botocore.exceptions import ClientError


class S3ServiceError(Exception):
    pass


class S3Service:
    def __init__(self, bucket_name: str, region: str):
        self.bucket_name = bucket_name
        self.region = region
        self._session = aioboto3.Session()

    @staticmethod
    def calculate_file_hash(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def generate_s3_key(user_id: UUID, file_hash: str, file_extension: str) -> str:
        return f"audio/{user_id}/{file_hash}.{file_extension}"

    @staticmethod
    def extract_file_extension(mime_type: str) -> str:
        mime_to_ext = {
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/flac": "flac",
            "audio/x-flac": "flac",
            "audio/aiff": "aiff",
            "audio/x-aiff": "aiff",
            "audio/ogg": "ogg",
            "audio/x-m4a": "m4a",
            "audio/mp4": "m4a",
        }
        ext = mime_to_ext.get(mime_type)
        if not ext:
            raise S3ServiceError(f"Unsupported MIME type: {mime_type}")
        return ext

    @staticmethod
    def validate_file_size(data: bytes, max_size: int = 100 * 1024 * 1024) -> None:
        if len(data) > max_size:
            raise S3ServiceError(
                f"File too large: {len(data)} bytes exceeds {max_size} bytes limit"
            )

    async def upload_file(self, data: bytes, s3_key: str, content_type: str) -> None:
        self.validate_file_size(data)
        try:
            async with self._session.client("s3", region_name=self.region) as s3_client:
                await s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=data,
                    ContentType=content_type,
                )
        except ClientError as e:
            raise S3ServiceError(f"Failed to upload file: {e}")

    async def get_file(self, s3_key: str) -> bytes:
        try:
            async with self._session.client("s3", region_name=self.region) as s3_client:
                response = await s3_client.get_object(
                    Bucket=self.bucket_name, Key=s3_key
                )
                async with response["Body"] as stream:
                    return await stream.read()
        except ClientError as e:
            raise S3ServiceError(f"Failed to get file: {e}")

    async def delete_file(self, s3_key: str) -> None:
        try:
            async with self._session.client("s3", region_name=self.region) as s3_client:
                await s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
        except ClientError as e:
            raise S3ServiceError(f"Failed to delete file: {e}")

    async def delete_files(self, s3_keys: list[str]) -> None:
        if not s3_keys:
            return
        try:
            async with self._session.client("s3", region_name=self.region) as s3_client:
                objects = [{"Key": key} for key in s3_keys]
                for i in range(0, len(objects), 1000):
                    batch = objects[i : i + 1000]
                    await s3_client.delete_objects(
                        Bucket=self.bucket_name, Delete={"Objects": batch}
                    )
        except ClientError as e:
            raise S3ServiceError(f"Failed to delete files: {e}")

    async def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        try:
            async with self._session.client("s3", region_name=self.region) as s3_client:
                url = await s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": s3_key},
                    ExpiresIn=expiration,
                )
                return url
        except ClientError as e:
            raise S3ServiceError(f"Failed to generate presigned URL: {e}")

    async def check_file_exists(self, s3_key: str) -> bool:
        try:
            async with self._session.client("s3", region_name=self.region) as s3_client:
                await s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
                return True
        except ClientError:
            return False
