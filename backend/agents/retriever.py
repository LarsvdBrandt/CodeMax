"""Retrieves file contents needed for context."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ProjectFile


async def retrieve_context(
    db: AsyncSession,
    project_id,
    affected_files: list[str],
    is_new: bool,
) -> dict[str, str]:
    if is_new:
        return {}

    files_to_fetch = list(affected_files)
    # Always include architecture summary if it exists
    if "_meta/architecture.md" not in files_to_fetch:
        files_to_fetch.append("_meta/architecture.md")

    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.project_id == project_id,
            ProjectFile.file_path.in_(files_to_fetch),
        )
    )
    return {f.file_path: f.content for f in result.scalars().all()}
