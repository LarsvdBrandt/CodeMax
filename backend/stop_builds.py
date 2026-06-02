"""Hard-stop all in-progress builds: marks projects/tasks as error, kills preview containers."""
import asyncio
import docker
from sqlalchemy import update
from database import AsyncSessionLocal, engine
from models import Project, Task, ProjectStatus, TaskStatus, Base


async def stop_all():
    async with AsyncSessionLocal() as db:
        # Mark all building projects as error
        proj_result = await db.execute(
            update(Project)
            .where(Project.status == ProjectStatus.building)
            .values(status=ProjectStatus.error)
            .returning(Project.id, Project.container_id)
        )
        stopped_projects = proj_result.fetchall()

        # Mark all queued/running tasks as error
        task_result = await db.execute(
            update(Task)
            .where(Task.status.in_([TaskStatus.queued, TaskStatus.running]))
            .values(status=TaskStatus.error)
            .returning(Task.id)
        )
        stopped_tasks = task_result.fetchall()

        await db.commit()

    print(f"Stopped {len(stopped_projects)} project(s), {len(stopped_tasks)} task(s)")

    # Kill any running preview containers that were mid-build
    try:
        dc = docker.from_env()
        for project_id, container_id in stopped_projects:
            if container_id:
                try:
                    c = dc.containers.get(container_id)
                    c.kill()
                    print(f"Killed container {container_id[:12]} for project {project_id}")
                except docker.errors.NotFound:
                    pass
    except Exception as e:
        print(f"Docker cleanup skipped: {e}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(stop_all())
