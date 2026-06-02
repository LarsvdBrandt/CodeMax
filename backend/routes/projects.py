import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import User, Project, ProjectFile, Task, ProjectStatus, TaskStatus
from auth import get_current_user
from queue_client import publish_job
from agents.builder import stop_container, restart_container, get_container_logs

router = APIRouter(prefix="/projects", tags=["projects"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    status: str
    preview_port: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FileOut(BaseModel):
    id: uuid.UUID
    file_path: str
    content: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: uuid.UUID
    prompt: str
    status: str
    agent_log: list
    created_at: datetime

    model_config = {"from_attributes": True}


class PromptRequest(BaseModel):
    prompt: str


class TaskQueued(BaseModel):
    task_id: uuid.UUID


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.user_id == current_user.id).order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=TaskQueued, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        status=ProjectStatus.building,
    )
    db.add(project)
    await db.flush()

    task = Task(
        id=uuid.uuid4(),
        project_id=project.id,
        prompt=body.description,
        status=TaskStatus.queued,
        agent_log=[],
    )
    db.add(task)
    await db.commit()

    await publish_job(task.id, project.id, body.description)
    return TaskQueued(task_id=task.id)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/status")
async def get_project_status(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_result = await db.execute(
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.created_at.desc())
        .limit(1)
    )
    latest_task = task_result.scalar_one_or_none()

    return {
        "status": project.status,
        "preview_port": project.preview_port,
        "task": {
            "id": str(latest_task.id),
            "status": latest_task.status,
            "agent_log": latest_task.agent_log,
        } if latest_task else None,
    }


@router.post("/{project_id}/prompt", response_model=TaskQueued)
async def send_prompt(
    project_id: uuid.UUID,
    body: PromptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = ProjectStatus.building
    task = Task(
        id=uuid.uuid4(),
        project_id=project_id,
        prompt=body.prompt,
        status=TaskStatus.queued,
        agent_log=[],
    )
    db.add(task)
    await db.commit()

    await publish_job(task.id, project_id, body.prompt)
    return TaskQueued(task_id=task.id)


@router.post("/{project_id}/retry", response_model=TaskQueued)
async def retry_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_result = await db.execute(
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.created_at.desc())
        .limit(1)
    )
    last_task = task_result.scalar_one_or_none()
    if not last_task:
        raise HTTPException(status_code=400, detail="No task to retry")

    project.status = ProjectStatus.building
    new_task = Task(
        id=uuid.uuid4(),
        project_id=project_id,
        prompt=last_task.prompt,
        status=TaskStatus.queued,
        agent_log=[],
    )
    db.add(new_task)
    await db.commit()

    await publish_job(new_task.id, project_id, last_task.prompt)
    return TaskQueued(task_id=new_task.id)


@router.get("/{project_id}/files", response_model=list[FileOut])
async def list_files(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.file_path)
    )
    return result.scalars().all()


@router.get("/{project_id}/files/{file_path:path}", response_model=FileOut)
async def get_file(
    project_id: uuid.UUID,
    file_path: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.project_id == project_id,
            ProjectFile.file_path == file_path,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f


class FileUpdateRequest(BaseModel):
    content: str


@router.put("/{project_id}/files/{file_path:path}")
async def update_file(
    project_id: uuid.UUID,
    file_path: str,
    body: FileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.project_id == project_id,
            ProjectFile.file_path == file_path,
        )
    )
    file_record = result.scalar_one_or_none()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    file_record.content = body.content
    file_record.updated_at = datetime.utcnow()

    projects_dir = os.environ.get("PROJECTS_DIR", "/projects")
    dest = Path(projects_dir) / str(project_id) / file_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(body.content)

    await db.commit()
    return {"ok": True}


@router.post("/{project_id}/stop")
async def stop_preview(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stop_container(str(project_id))
    project.status = ProjectStatus.idle
    await db.commit()
    return {"stopped": True}


@router.post("/{project_id}/start")
async def start_preview(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    ok = restart_container(str(project_id))
    if ok:
        project.status = ProjectStatus.ready
        await db.commit()
        return {"started": True}
    raise HTTPException(status_code=400, detail="Container not found — retry a build first")


@router.get("/{project_id}/logs")
async def preview_logs(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    lines = get_container_logs(str(project_id))
    return {"lines": lines}


@router.get("/{project_id}/tasks", response_model=list[TaskOut])
async def list_tasks(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.created_at.asc())
    )
    return result.scalars().all()
