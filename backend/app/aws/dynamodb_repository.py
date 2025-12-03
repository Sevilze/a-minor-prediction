from decimal import Decimal
from typing import Optional
from uuid import UUID

import aioboto3
from botocore.exceptions import ClientError

from .models import (
    AudioProjectEntry,
    ChordPredictionEntry,
    User,
    WaveformDataEntry,
)


class RepositoryError(Exception):
    pass


class DynamoDbRepository:
    def __init__(
        self,
        users_table: str,
        projects_table: str,
        chords_table: str,
        waveform_table: str,
        region: str,
    ):
        self.users_table = users_table
        self.projects_table = projects_table
        self.chords_table = chords_table
        self.waveform_table = waveform_table
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

    async def create_project(self, project: AudioProjectEntry) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.projects_table)
                await table.put_item(Item=project.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to create project: {e}")

    async def get_project_by_id(self, project_id: str) -> Optional[AudioProjectEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.projects_table)
                response = await table.get_item(Key={"id": project_id})
                if "Item" not in response:
                    return None
                return AudioProjectEntry.from_dynamodb_item(response["Item"])
        except ClientError as e:
            raise RepositoryError(f"Failed to get project: {e}")

    async def get_user_projects(self, user_id: UUID) -> list[AudioProjectEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.projects_table)
                response = await table.query(
                    IndexName="user_id-index",
                    KeyConditionExpression="user_id = :uid",
                    ExpressionAttributeValues={":uid": str(user_id)},
                )
                return [
                    AudioProjectEntry.from_dynamodb_item(item)
                    for item in response.get("Items", [])
                ]
        except ClientError as e:
            raise RepositoryError(f"Failed to get user projects: {e}")

    async def update_project(self, project: AudioProjectEntry) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.projects_table)
                await table.put_item(Item=project.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to update project: {e}")

    async def delete_project(self, project_id: str) -> None:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.projects_table)
                await table.delete_item(Key={"id": project_id})
        except ClientError as e:
            raise RepositoryError(f"Failed to delete project: {e}")

    async def create_chord_predictions(
        self, predictions: list[ChordPredictionEntry]
    ) -> None:
        if not predictions:
            return
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.chords_table)
                async with table.batch_writer() as batch:
                    for pred in predictions:
                        await batch.put_item(Item=pred.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to create chord predictions: {e}")

    async def get_project_chords(self, project_id: str) -> list[ChordPredictionEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.chords_table)
                response = await table.query(
                    KeyConditionExpression="project_id = :pid",
                    ExpressionAttributeValues={":pid": project_id},
                )
                return [
                    ChordPredictionEntry.from_dynamodb_item(item)
                    for item in response.get("Items", [])
                ]
        except ClientError as e:
            raise RepositoryError(f"Failed to get chords: {e}")

    async def delete_project_chords(self, project_id: str) -> None:
        try:
            chords = await self.get_project_chords(project_id)
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.chords_table)
                async with table.batch_writer() as batch:
                    for chord in chords:
                        await batch.delete_item(
                            Key={
                                "project_id": project_id,
                                "timestamp": Decimal(str(chord.timestamp)),
                            }
                        )
        except ClientError as e:
            raise RepositoryError(f"Failed to delete chords: {e}")

    async def create_waveform_data(
        self, waveform_points: list[WaveformDataEntry]
    ) -> None:
        if not waveform_points:
            return
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.waveform_table)
                async with table.batch_writer() as batch:
                    for point in waveform_points:
                        await batch.put_item(Item=point.to_dynamodb_item())
        except ClientError as e:
            raise RepositoryError(f"Failed to create waveform data: {e}")

    async def get_project_waveform(self, project_id: str) -> list[WaveformDataEntry]:
        try:
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.waveform_table)
                response = await table.query(
                    KeyConditionExpression="project_id = :pid",
                    ExpressionAttributeValues={":pid": project_id},
                )
                return [
                    WaveformDataEntry.from_dynamodb_item(item)
                    for item in response.get("Items", [])
                ]
        except ClientError as e:
            raise RepositoryError(f"Failed to get waveform: {e}")

    async def delete_project_waveform(self, project_id: str) -> None:
        try:
            waveform = await self.get_project_waveform(project_id)
            async with self._session.resource(
                "dynamodb", region_name=self.region
            ) as dynamodb:
                table = await dynamodb.Table(self.waveform_table)
                async with table.batch_writer() as batch:
                    for point in waveform:
                        await batch.delete_item(
                            Key={
                                "project_id": project_id,
                                "time": Decimal(str(point.time)),
                            }
                        )
        except ClientError as e:
            raise RepositoryError(f"Failed to delete waveform: {e}")

    async def delete_user_projects(self, user_id: UUID) -> None:
        projects = await self.get_user_projects(user_id)
        for project in projects:
            await self.delete_project_chords(project.id)
            await self.delete_project_waveform(project.id)
            await self.delete_project(project.id)
