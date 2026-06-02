"""Main agent pipeline orchestrator."""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from models import Task, Project, ProjectFile, ProjectStatus, TaskStatus
from agents.analyzer import analyze
from agents.retriever import retrieve_context
from agents.planner import plan
from agents.codegen import generate_file, generate_architecture_summary, fix_errors
from agents.builder import provision_preview, seed_template, get_container_errors

PROJECTS_DIR = os.environ.get("PROJECTS_DIR", "/projects")


def _now() -> datetime:
    """Timezone-naive UTC datetime, matching the DB column type."""
    return datetime.utcnow()


def _log_step(agent_log: list, step: str, status: str, detail: str = "") -> list:
    entry = {
        "step": step,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "detail": detail,
    }
    return agent_log + [entry]


async def _save_log(db: AsyncSession, task: Task, log: list) -> None:
    task.agent_log = log
    task.updated_at = _now()
    await db.commit()


async def run_pipeline(task_id: str, project_id: str, prompt: str, db: AsyncSession) -> None:
    task_uuid = uuid.UUID(task_id)
    project_uuid = uuid.UUID(project_id)

    task_result = await db.execute(select(Task).where(Task.id == task_uuid))
    task = task_result.scalar_one()
    project_result = await db.execute(select(Project).where(Project.id == project_uuid))
    project = project_result.scalar_one()

    log = []

    try:
        # Step 1 — Mark running
        task.status = TaskStatus.running
        log = _log_step(log, "start", "running", f"Processing prompt: {prompt[:80]}")
        await _save_log(db, task, log)

        # Step 2 — Seed template scaffold into the project directory first
        project_dir = Path(PROJECTS_DIR) / project_id
        seed_template(project_dir)

        # Step 3a — Get existing files
        files_result = await db.execute(
            select(ProjectFile).where(ProjectFile.project_id == project_uuid)
        )
        existing_files = [f.file_path for f in files_result.scalars().all()]

        # Step 3 — Analyzer
        log = _log_step(log, "analyze", "running", "Classifying change type")
        await _save_log(db, task, log)

        analysis = await analyze(prompt, existing_files)
        is_new = analysis.get("change_type") == "new_project" or not existing_files

        log = _log_step(log, "analyze", "done", f"{analysis.get('change_type')}: {analysis.get('summary')}")
        await _save_log(db, task, log)

        # Step 4 — Retrieve context
        log = _log_step(log, "retrieve", "running", "Fetching relevant file context")
        await _save_log(db, task, log)

        file_contexts = await retrieve_context(db, project_uuid, analysis.get("affected_files", []), is_new)
        arch_summary = file_contexts.get("_meta/architecture.md")

        log = _log_step(log, "retrieve", "done", f"Retrieved {len(file_contexts)} files")
        await _save_log(db, task, log)

        # Step 5 — Planner
        log = _log_step(log, "plan", "running", "Creating implementation plan")
        await _save_log(db, task, log)

        plan_result = await plan(prompt, analysis, file_contexts)
        tasks = plan_result.get("tasks", [])

        log = _log_step(log, "plan", "done", f"Planned {len(tasks)} file operations")
        await _save_log(db, task, log)

        # Step 6 — Code generation
        for i, file_task in enumerate(tasks):
            file_path = file_task["file"]
            action = file_task.get("action", "modify")
            description = file_task.get("description", "")

            log = _log_step(log, f"codegen_{i}", "running", f"{action}: {file_path}")
            await _save_log(db, task, log)

            if action == "delete":
                await db.execute(
                    select(ProjectFile).where(
                        ProjectFile.project_id == project_uuid,
                        ProjectFile.file_path == file_path,
                    )
                )
                (project_dir / file_path).unlink(missing_ok=True)
                log = _log_step(log, f"codegen_{i}", "done", f"Deleted {file_path}")
            else:
                current_content = file_contexts.get(file_path)
                content = await generate_file(description, file_path, current_content, arch_summary)

                dest = project_dir / file_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(content)

                existing_result = await db.execute(
                    select(ProjectFile).where(
                        ProjectFile.project_id == project_uuid,
                        ProjectFile.file_path == file_path,
                    )
                )
                existing_file = existing_result.scalar_one_or_none()
                if existing_file:
                    existing_file.content = content
                    existing_file.updated_at = _now()
                else:
                    db.add(ProjectFile(
                        id=uuid.uuid4(),
                        project_id=project_uuid,
                        file_path=file_path,
                        content=content,
                    ))
                log = _log_step(log, f"codegen_{i}", "done", f"Written {file_path} ({len(content)} chars)")

            await db.commit()
            await _save_log(db, task, log)

        # Step 7 — Update architecture summary
        all_files_result = await db.execute(
            select(ProjectFile).where(ProjectFile.project_id == project_uuid)
        )
        all_file_paths = [f.file_path for f in all_files_result.scalars().all()]

        arch_content = await generate_architecture_summary(
            project.name,
            project.description,
            [p for p in all_file_paths if not p.startswith("_meta/")],
            analysis.get("summary", ""),
        )

        arch_dest = project_dir / "_meta" / "architecture.md"
        arch_dest.parent.mkdir(parents=True, exist_ok=True)
        arch_dest.write_text(arch_content)

        arch_result = await db.execute(
            select(ProjectFile).where(
                ProjectFile.project_id == project_uuid,
                ProjectFile.file_path == "_meta/architecture.md",
            )
        )
        arch_file = arch_result.scalar_one_or_none()
        if arch_file:
            arch_file.content = arch_content
            arch_file.updated_at = _now()
        else:
            db.add(ProjectFile(
                id=uuid.uuid4(),
                project_id=project_uuid,
                file_path="_meta/architecture.md",
                content=arch_content,
            ))
        await db.commit()

        # Step 8 — Build and provision preview
        log = _log_step(log, "build", "running", "Starting preview container")
        await _save_log(db, task, log)

        container_id, port, is_ready = provision_preview(
            project_id, project.container_id
        )

        project.container_id = container_id
        project.preview_port = port
        project.updated_at = _now()

        if not is_ready:
            project.status = ProjectStatus.error
            task.status = TaskStatus.error
            log = _log_step(log, "build", "error", "Container timed out")
            await _save_log(db, task, log)
            await db.commit()
            return

        log = _log_step(log, "build", "done", f"Container ready on port {port}")
        await _save_log(db, task, log)

        # Step 9 — Auto-fix compilation errors (up to 3 rounds)
        for fix_attempt in range(3):
            error_log_text = get_container_errors(project_id)
            if not error_log_text:
                break

            log = _log_step(
                log, f"autofix_{fix_attempt}", "running",
                f"Compilation error detected, fixing (attempt {fix_attempt + 1}/3)..."
            )
            await _save_log(db, task, log)

            # Gather current app files as context (skip meta)
            cur_files_result = await db.execute(
                select(ProjectFile).where(ProjectFile.project_id == project_uuid)
            )
            file_contents = {
                f.file_path: f.content
                for f in cur_files_result.scalars().all()
                if not f.file_path.startswith("_meta/")
            }

            fixed = await fix_errors(error_log_text, file_contents)

            for file_path, content in fixed.items():
                dest = project_dir / file_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(content)

                fix_result = await db.execute(
                    select(ProjectFile).where(
                        ProjectFile.project_id == project_uuid,
                        ProjectFile.file_path == file_path,
                    )
                )
                fix_file = fix_result.scalar_one_or_none()
                if fix_file:
                    fix_file.content = content
                    fix_file.updated_at = _now()
                else:
                    db.add(ProjectFile(
                        id=uuid.uuid4(),
                        project_id=project_uuid,
                        file_path=file_path,
                        content=content,
                    ))

            await db.commit()
            log = _log_step(
                log, f"autofix_{fix_attempt}", "done",
                f"Rewrote {len(fixed)} file(s)"
            )
            await _save_log(db, task, log)

        project.status = ProjectStatus.ready
        project.updated_at = _now()
        task.status = TaskStatus.done
        await db.commit()

    except Exception as exc:
        await db.rollback()
        log = _log_step(log, "error", "error", str(exc))
        task.status = TaskStatus.error
        task.agent_log = log
        task.updated_at = _now()
        project.status = ProjectStatus.error
        project.updated_at = _now()
        await db.commit()
        raise
