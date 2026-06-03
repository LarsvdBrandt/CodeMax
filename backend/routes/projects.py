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
    project_id: Optional[uuid.UUID] = None


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
    return TaskQueued(task_id=task.id, project_id=project.id)


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


class ProjectUpdateRequest(BaseModel):
    name: str


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.name = body.name.strip() or project.name
    project.updated_at = datetime.utcnow()
    await db.commit()
    return project


class ProvideKeyRequest(BaseModel):
    env_var: str
    key_value: str
    service: str = "custom"


@router.post("/{project_id}/provide_key")
async def provide_api_key(
    project_id: uuid.UUID,
    body: ProvideKeyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a missing API key and resume the paused build."""
    import asyncio
    from pathlib import Path
    from agents.api_keys import write_env_local
    from agents.builder import provision_preview, get_container_errors
    from agents.codegen import fix_errors
    from models import UserApiKey, ProjectFile

    # Verify project ownership
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find the paused task
    task_result = await db.execute(
        select(Task).where(Task.project_id == project_id, Task.status == TaskStatus.waiting_for_key)
        .order_by(Task.created_at.desc()).limit(1)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="No paused task found")

    # 1. Save key to user_api_keys
    # Check if already exists for this service
    existing_key = await db.execute(
        select(UserApiKey).where(
            UserApiKey.user_id == current_user.id,
            UserApiKey.service == body.service,
        )
    )
    if existing_key.scalar_one_or_none():
        # Update existing
        upd = existing_key.scalar_one_or_none()
    else:
        upd = UserApiKey(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=body.env_var,
            service=body.service,
            key_value=body.key_value,
        )
        db.add(upd)

    # 2. Write .env.local
    projects_dir = os.environ.get("PROJECTS_DIR", "/projects")
    project_dir = Path(projects_dir) / str(project_id)
    write_env_local(project_dir, {body.env_var: body.key_value})

    # 3. Resume build in background
    project.status = ProjectStatus.building
    task.status = TaskStatus.running
    agent_log = list(task.agent_log)
    agent_log.append({
        "step": "api_key_provided",
        "status": "done",
        "timestamp": datetime.utcnow().isoformat(),
        "detail": f"{body.env_var} saved, resuming build...",
    })
    task.agent_log = agent_log
    task.updated_at = datetime.utcnow()
    await db.commit()

    # Re-queue the build phase
    from queue_client import publish_job
    resume_task = Task(
        id=uuid.uuid4(),
        project_id=project_id,
        prompt=task.prompt,
        status=TaskStatus.queued,
        agent_log=[],
    )
    db.add(resume_task)
    await db.commit()
    await publish_job(resume_task.id, project_id, task.prompt)

    return {"ok": True, "resumed": True}


class DetectKeysRequest(BaseModel):
    prompt: str


@router.post("/{project_id}/detect_keys")
async def detect_keys(
    project_id: uuid.UUID,
    body: DetectKeysRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyse a prompt with GPT-4o and return which API keys are missing from the user's stored keys."""
    from agents.api_keys import detect_required_services, ENV_VAR_MAP
    from models import UserApiKey

    proj = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    required = await detect_required_services(body.prompt)
    if not required:
        return {"missing": []}

    # Build map of what the user already has stored
    stored_result = await db.execute(
        select(UserApiKey).where(UserApiKey.user_id == current_user.id)
    )
    stored_map: dict[str, str] = {}
    for k in stored_result.scalars().all():
        for env_var, (service, _) in ENV_VAR_MAP.items():
            if k.service.lower() == service.lower() or k.name.upper() == env_var:
                stored_map[env_var] = k.key_value

    missing = [
        {"env_var": env_var, "service": service, "description": desc}
        for env_var, service, desc in required
        if env_var not in stored_map
    ]
    return {"missing": missing}


@router.delete("/{project_id}")
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import shutil
    from agents.builder import remove_container

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Remove Docker container (fire-and-forget, don't fail if missing)
    try:
        remove_container(str(project_id))
    except Exception:
        pass

    # Remove project files from volume
    projects_dir = os.environ.get("PROJECTS_DIR", "/projects")
    project_dir = Path(projects_dir) / str(project_id)
    try:
        if project_dir.exists():
            shutil.rmtree(project_dir, ignore_errors=True)
    except Exception:
        pass

    await db.delete(project)
    await db.commit()
    return {"deleted": True}


class PlanRequest(BaseModel):
    description: str


class ClarifyRequest(BaseModel):
    prompt: str
    context: Optional[str] = None


@router.post("/{project_id}/clarify")
async def clarify_prompt(
    project_id: uuid.UUID,
    body: ClarifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from openai import AsyncOpenAI
    import os, json as _json

    proj = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    content = f"Prompt: {body.prompt}"
    if body.context:
        content += f"\n\nContext from previous clarification: {body.context}"

    resp = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": (
                    "You help clarify web app build requests. Decide if you need one quick clarifying question "
                    "to produce a better result. Ask about: color scheme, specific text/branding, key feature "
                    "details, or target audience — but only when the answer would meaningfully change what gets built.\n\n"
                    "Respond ONLY with valid JSON:\n"
                    '{"needs_clarification": false}\n'
                    "OR\n"
                    '{"needs_clarification": true, "question": "...", "suggestions": ["short option 1", "short option 2", "short option 3"]}\n\n'
                    "Keep the question under 12 words. Keep each suggestion under 5 words. Cover clearly different directions."
                ),
            },
            {"role": "user", "content": content},
        ],
    )
    return _json.loads(resp.choices[0].message.content)


@router.post("/planning", response_model=dict)
async def generate_plan(
    body: PlanRequest,
    current_user: User = Depends(get_current_user),
):
    from openai import AsyncOpenAI
    import os

    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert web app architect. Given a project description, create a detailed plan for building it. Be specific about pages, components, features, and tech stack. Format as a clear, bullet-pointed plan."
                },
                {
                    "role": "user",
                    "content": f"Create a detailed implementation plan for: {body.description}"
                }
            ],
            temperature=0.7,
        )
        plan_text = response.choices[0].message.content
        return {"plan": plan_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")
