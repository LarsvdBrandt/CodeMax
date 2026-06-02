"""Manages Docker containers for user app previews."""
import os
import time
import shutil
import httpx
import docker
from pathlib import Path

PROJECTS_DIR = os.environ.get("PROJECTS_DIR", "/projects")
TEMPLATES_DIR = os.environ.get("TEMPLATES_DIR", "/templates")
PROJECTS_VOLUME = "codemax_projects"
NGINX_CONF = "/etc/nginx/conf.d/previews.conf"
PORT_START = 4000
PORT_END = 5000
DOCKER_NETWORK = "codemax_network"


def _docker_client() -> docker.DockerClient:
    return docker.from_env()


def _used_ports() -> set[int]:
    dc = _docker_client()
    ports = set()
    for container in dc.containers.list():
        for port_bindings in (container.ports or {}).values():
            if port_bindings:
                for pb in port_bindings:
                    try:
                        ports.add(int(pb["HostPort"]))
                    except (KeyError, ValueError):
                        pass
    return ports


def _pick_free_port() -> int:
    used = _used_ports()
    for p in range(PORT_START, PORT_END):
        if p not in used:
            return p
    raise RuntimeError("No free ports available in range 4000-5000")


def seed_template(project_dir: Path) -> None:
    """Copy scaffold files from the base template, never overwriting existing app files."""
    template_dir = Path(TEMPLATES_DIR) / "nextjs-base"
    project_dir.mkdir(parents=True, exist_ok=True)
    for src in template_dir.rglob("*"):
        if src.is_dir():
            continue
        rel = src.relative_to(template_dir)
        dest = project_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            shutil.copy2(str(src), str(dest))


def _rebuild_nginx(project_id: str) -> None:
    """Write Nginx config and reload via Docker exec into the nginx container."""
    conf_path = Path(NGINX_CONF)
    conf_path.parent.mkdir(parents=True, exist_ok=True)

    lines = []
    if conf_path.exists():
        existing = conf_path.read_text()
        blocks = existing.split("\n\n")
        lines = [b for b in blocks if f"project_{project_id}" not in b and b.strip()]

    container_name = f"codemax_preview_{project_id}"
    new_block = f"""# project_{project_id}
location /preview/{project_id}/ {{
    set $upstream {container_name};
    proxy_pass http://$upstream:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}}"""
    lines.append(new_block)
    conf_path.write_text("\n\n".join(lines) + "\n")

    # Reload nginx by exec-ing into the nginx container
    try:
        dc = _docker_client()
        nginx_containers = dc.containers.list(filters={"name": "codemax-nginx"})
        if nginx_containers:
            nginx_containers[0].exec_run("nginx -s reload")
    except Exception:
        pass


def _wait_for_http(project_id: str, timeout: int = 120) -> bool:
    """Poll until the preview container responds on any HTTP status (server is up)."""
    container_name = f"codemax_preview_{project_id}"
    url = f"http://{container_name}:3001"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            httpx.get(url, timeout=3)
            return True  # any response = server is listening
        except Exception:
            pass
        time.sleep(3)
    return False


def start_or_rebuild_container(project_id: str, existing_container_id: str | None) -> tuple[str, int]:
    dc = _docker_client()

    if existing_container_id:
        try:
            container = dc.containers.get(existing_container_id)
            if container.status == "running":
                port_bindings = container.ports.get("3001/tcp")
                port = int(port_bindings[0]["HostPort"]) if port_bindings else PORT_START
                return existing_container_id, port
            else:
                container.remove(force=True)
        except docker.errors.NotFound:
            pass

    # Remove stale container with same name if it exists
    try:
        old = dc.containers.get(f"codemax_preview_{project_id}")
        old.remove(force=True)
    except docker.errors.NotFound:
        pass

    port = _pick_free_port()

    # Mount the named volume and set working_dir to the project subdirectory.
    # Using a named volume avoids Docker Desktop "path not shared" errors on Mac.
    container = dc.containers.run(
        image="node:20-alpine",
        command=f"sh -c 'npm install && npm run dev'",
        detach=True,
        volumes={PROJECTS_VOLUME: {"bind": "/projects", "mode": "rw"}},
        working_dir=f"/projects/{project_id}",
        ports={"3001/tcp": port},
        network=DOCKER_NETWORK,
        name=f"codemax_preview_{project_id}",
        remove=False,
        environment={"NODE_ENV": "development"},
    )

    return container.id, port


def provision_preview(project_id: str, existing_container_id: str | None) -> tuple[str, int, bool]:
    """Returns (container_id, port, is_ready). Template must already be seeded."""
    container_id, port = start_or_rebuild_container(project_id, existing_container_id)
    _rebuild_nginx(project_id)
    is_ready = _wait_for_http(project_id)
    return container_id, port, is_ready
