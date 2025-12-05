from typing import Optional
from uuid import UUID

import aioboto3
from botocore.exceptions import ClientError

from .models import (
    AudioTrackEntry,
    ChordPredictionEntry,
    PlaylistEntry,
    User,
)


class RepositoryError(Exception):
    pass


class DynamoDbRepository:
    def __init__(
        self,
        users_table: str,
        tracks_table: str,
        predictions_table: str,
        playlists_table: str,
        region: str,
    ):
        self.users_table = users_table
        self.tracks_table = tracks_table
        self.predictions_table = predictions_table
        self.playlists_table = playlists_table
        self.region = region
        self._session = aioboto3.Session()

    async def create_user(self, user: User) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.users_table)
                await table.put_item(Item=user.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to create user: {e}")

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.users_table)
                response = await table.get_item(Key={"id": str(user_id)})
                if "Item" not in response:
                    return None
                return User.from_dynamodb_item(response["Item"])
        except ClientError as e:
            raise RepositoryError(f"Failed to get user: {e}")

    async def get_user_by_cognito_sub(self, cognito_sub: str) -> Optional[User]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.users_table)
                response = await table.scan(
                    FilterExpression="cognito_sub = :sub",
                    ExpressionAttributeValues={":sub": cognito_sub},
                )
                items = response.get("Items", [])
                if not items:
                    return None
                return User.from_dynamodb_item(items[0])
        except ClientError as e:
            raise RepositoryError(f"Failed to get user by cognito_sub: {e}")

    async def update_user(self, user: User) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.users_table)
                await table.put_item(Item=user.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to update user: {e}")

    async def create_track(self, track: AudioTrackEntry) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.tracks_table)
                await table.put_item(Item=track.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to create track: {e}")

    async def get_track_by_id(self, track_id: str) -> Optional[AudioTrackEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.tracks_table)
                response = await table.get_item(Key={"id": track_id})
                if "Item" not in response:
                    return None
                return AudioTrackEntry.from_dynamodb_item(response["Item"])
        except ClientError as e:
            raise RepositoryError(f"Failed to get track: {e}")

    async def get_user_tracks(self, user_id: UUID) -> list[AudioTrackEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.tracks_table)
                response = await table.query(
                    IndexName="user_id-index",
                    KeyConditionExpression="user_id = :uid",
                    ExpressionAttributeValues={":uid": str(user_id)},
                )
                return [
                    AudioTrackEntry.from_dynamodb_item(item)
                    for item in response.get("Items", [])
                ]
        except ClientError as e:
            raise RepositoryError(f"Failed to get user tracks: {e}")

    async def update_track(self, track: AudioTrackEntry) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.tracks_table)
                await table.put_item(Item=track.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to update track: {e}")

    async def delete_track(self, track_id: str) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.tracks_table)
                await table.delete_item(Key={"id": track_id})
        except ClientError as e:
            raise RepositoryError(f"Failed to delete track: {e}")

    async def create_predictions(self, entry: ChordPredictionEntry) -> None:
        if not entry.chords:
            return
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.predictions_table)
                await table.put_item(Item=entry.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to create predictions: {e}")

    async def get_track_predictions(
        self, track_id: str
    ) -> Optional[ChordPredictionEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.predictions_table)
                response = await table.get_item(Key={"track_id": track_id})
                if "Item" not in response:
                    return None
                return ChordPredictionEntry.from_dynamodb_item(response["Item"])
        except ClientError as e:
            raise RepositoryError(f"Failed to get predictions: {e}")

    async def delete_track_predictions(self, track_id: str) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.predictions_table)
                await table.delete_item(Key={"track_id": track_id})
        except ClientError as e:
            raise RepositoryError(f"Failed to delete predictions: {e}")

    async def delete_user_tracks(self, user_id: UUID) -> None:
        tracks = await self.get_user_tracks(user_id)
        for track in tracks:
            await self.delete_track_predictions(track.id)
            await self.delete_track(track.id)

    async def create_playlist(self, playlist: PlaylistEntry) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.playlists_table)
                await table.put_item(Item=playlist.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to create playlist: {e}")

    async def get_playlist_by_id(self, playlist_id: str) -> Optional[PlaylistEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.playlists_table)
                response = await table.get_item(Key={"id": playlist_id})
                if "Item" not in response:
                    return None
                return PlaylistEntry.from_dynamodb_item(response["Item"])
        except ClientError as e:
            raise RepositoryError(f"Failed to get playlist: {e}")

    async def get_user_playlists(self, user_id: str) -> list[PlaylistEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.playlists_table)
                response = await table.scan(
                    FilterExpression="user_id = :uid",
                    ExpressionAttributeValues={":uid": str(user_id)},
                )
                return [
                    PlaylistEntry.from_dynamodb_item(item)
                    for item in response.get("Items", [])
                ]
        except ClientError as e:
            raise RepositoryError(f"Failed to get user playlists: {e}")

    async def update_playlist(self, playlist: PlaylistEntry) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.playlists_table)
                await table.put_item(Item=playlist.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to update playlist: {e}")

    async def delete_playlist(self, playlist_id: str) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.playlists_table)
                await table.delete_item(Key={"id": playlist_id})
        except ClientError as e:
            raise RepositoryError(f"Failed to delete playlist: {e}")

    async def get_playlist_tracks(self, playlist_id: str) -> list[AudioTrackEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.tracks_table)
                response = await table.scan(
                    FilterExpression="playlist_id = :pid",
                    ExpressionAttributeValues={":pid": playlist_id},
                )
                return [
                    AudioTrackEntry.from_dynamodb_item(item)
                    for item in response.get("Items", [])
                ]
        except ClientError as e:
            raise RepositoryError(f"Failed to get playlist tracks: {e}")

    async def delete_playlist_with_tracks(self, playlist_id: str, user_id: str) -> None:
        tracks = await self.get_playlist_tracks(playlist_id)
        for track in tracks:
            if track.user_id == user_id:
                await self.delete_track_predictions(track.id)
                await self.delete_track(track.id)
        await self.delete_playlist(playlist_id)
