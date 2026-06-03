"""Manages Docker containers for user app previews."""
import os
import re
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


ERROR_INDICATORS = [
    # Compile-time
    "Module not found",
    "Failed to compile",
    "SyntaxError",
    "Cannot find module",
    # Next.js API route export errors
    "does not export a default function",
    # TypeScript syntax in .js files (swc parser errors)
    "Expected ',', got ':'",
    "Expected expression",
    "x Expected",
    "Unexpected token",
    # Tailwind / PostCSS
    "class does not exist",
    "does not exist. If",
    # Runtime / Next.js server errors
    "ReferenceError",
    "TypeError:",
    "RangeError:",
    "Invalid <Link>",
    "⨯ Error:",
    "⨯ TypeError",
    "⨯ ReferenceError",
    "Unhandled Runtime Error",
    " 500 in ",
    "Error: Element type is invalid",
    "Error: Hydration failed",
    "Error: Text content does not match",
]

# Matches: Can't resolve 'some-pkg' or Can't resolve '@scope/pkg'
_MISSING_PKG_RE = re.compile(r"Can't resolve '([^']+)'")


def extract_missing_packages(error_log: str) -> list[str]:
    """Return npm package names referenced in 'Can't resolve' errors."""
    pkgs: set[str] = set()
    for m in _MISSING_PKG_RE.finditer(error_log):
        raw = m.group(1)
        if raw.startswith(".") or raw.startswith("/"):
            continue  # skip relative / absolute imports
        if raw.startswith("@"):
            # @scope/package[/subpath] → @scope/package
            parts = raw.split("/")
            pkg = "/".join(parts[:2]) if len(parts) >= 2 else raw
        else:
            # package[/subpath] → package
            pkg = raw.split("/")[0]
        pkgs.add(pkg)
    return list(pkgs)


def install_package_in_container(project_id: str, package: str) -> bool:
    """Run `npm install <package>` inside the running preview container."""
    dc = _docker_client()
    try:
        container = dc.containers.get(f"codemax_preview_{project_id}")
        result = container.exec_run(
            ["npm", "install", package],
            workdir=f"/projects/{project_id}",
        )
        return result.exit_code == 0
    except Exception:
        return False


def run_npm_install(project_id: str) -> bool:
    """Run full `npm install` in the container (installs everything in package.json)."""
    dc = _docker_client()
    try:
        container = dc.containers.get(f"codemax_preview_{project_id}")
        result = container.exec_run(
            ["npm", "install"],
            workdir=f"/projects/{project_id}",
        )
        return result.exit_code == 0
    except Exception:
        return False


# Matches relative file references in Next.js error output: ./utils/googleMaps.js:1:1
_ERROR_FILE_RE = re.compile(r"\./([a-zA-Z0-9/_\-]+\.(js|jsx|ts|tsx|mjs|cjs))")


def touch_failing_files(project_id: str, error_log: str) -> list[str]:
    """Rewrite files mentioned in the error log to trigger Next.js hot-reload via chokidar polling."""
    touched: list[str] = []
    seen: set[str] = set()
    for m in _ERROR_FILE_RE.finditer(error_log):
        rel = m.group(1)
        if rel in seen:
            continue
        seen.add(rel)
        abs_path = Path(PROJECTS_DIR) / project_id / rel
        try:
            if abs_path.exists():
                abs_path.write_text(abs_path.read_text())
                touched.append(rel)
        except OSError:
            pass
    return touched


def stop_container(project_id: str) -> bool:
    dc = _docker_client()
    try:
        c = dc.containers.get(f"codemax_preview_{project_id}")
        c.stop(timeout=5)
        return True
    except docker.errors.NotFound:
        return False


def remove_container(project_id: str) -> bool:
    """Force-stop and remove the preview container for a project."""
    dc = _docker_client()
    try:
        c = dc.containers.get(f"codemax_preview_{project_id}")
        c.remove(force=True)
        return True
    except docker.errors.NotFound:
        return False


def restart_container(project_id: str) -> bool:
    dc = _docker_client()
    try:
        c = dc.containers.get(f"codemax_preview_{project_id}")
        c.start()
        return True
    except docker.errors.NotFound:
        return False


def get_container_logs(project_id: str, tail: int = 150) -> list[str]:
    dc = _docker_client()
    try:
        c = dc.containers.get(f"codemax_preview_{project_id}")
        raw = c.logs(tail=tail, timestamps=True).decode(errors="replace")
        return raw.splitlines()
    except docker.errors.NotFound:
        return []


def get_container_errors(project_id: str, wait_seconds: int = 15) -> str | None:
    """Wait for Next.js to (re)compile, then return error log if any errors found.

    Also does a live HTTP probe — a 500 response always counts as an error even
    when the compile-error indicators are absent from the log tail.
    """
    time.sleep(wait_seconds)
    dc = _docker_client()
    logs = ""
    try:
        container = dc.containers.get(f"codemax_preview_{project_id}")
        logs = container.logs(tail=300).decode(errors="replace")
    except Exception:
        pass

    has_log_error = any(indicator in logs for indicator in ERROR_INDICATORS)

    # HTTP probe: request / and check for 500
    container_name = f"codemax_preview_{project_id}"
    http_error_body = ""
    try:
        r = httpx.get(f"http://{container_name}:3001", timeout=5, follow_redirects=True)
        if r.status_code >= 500:
            http_error_body = f"HTTP {r.status_code} from /\n" + r.text[:2000]
    except Exception:
        pass

    if has_log_error or http_error_body:
        return (logs[-4000:] + "\n" + http_error_body).strip()
    return None


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
        environment={
            "NODE_ENV": "development",
            # Force polling so file writes from the backend container trigger hot-reload
            # (named Docker volumes don't propagate inotify events between containers)
            "CHOKIDAR_USEPOLLING": "true",
            "CHOKIDAR_INTERVAL": "500",
        },
    )

    return container.id, port


def provision_preview(project_id: str, existing_container_id: str | None) -> tuple[str, int, bool]:
    """Returns (container_id, port, is_ready). Template must already be seeded."""
    container_id, port = start_or_rebuild_container(project_id, existing_container_id)
    _rebuild_nginx(project_id)
    is_ready = _wait_for_http(project_id)
    return container_id, port, is_ready
