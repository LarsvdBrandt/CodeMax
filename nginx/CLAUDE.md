# CodeMax — Nginx

Reverse proxy that routes live preview traffic from generated Next.js apps to their Docker containers.

## Role in the System

Nginx does **one thing**: serve project preview URLs. It runs on port 8080 and routes `/preview/{projectId}` (or similar paths) to the correct Docker container that Spring Boot started for that project/branch.

The frontend and API have their own ports (3000 and 8000) and are accessed directly in development, or behind this Nginx in production.

---

## Port Map

| Port | Traffic |
|---|---|
| 8080 | External — main entry point for previews |
| (3000) | Frontend Next.js — direct in dev, or proxied |
| (8000) | Spring Boot API — direct in dev, or proxied |

---

## File Structure

```
nginx/
├── Dockerfile        Builds nginx:alpine image, copies nginx.conf
├── nginx.conf        Main config: worker processes, resolver, include conf.d/
└── conf.d/           Dynamic location blocks — one .conf per active project preview
```

## nginx.conf

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    resolver 127.0.0.11 valid=5s;   # Docker embedded DNS

    server {
        listen 8080;

        # Preview routes — Spring Boot writes .conf files here at runtime
        include /etc/nginx/conf.d/*.conf;

        # Fallback for unknown paths
        location / {
            return 404 "No preview found";
        }
    }
}
```

Key detail: `resolver 127.0.0.11` is Docker's internal DNS. This is required so Nginx can resolve container hostnames dynamically (container names change as projects are created/destroyed).

## conf.d/ — Dynamic Preview Routing

Spring Boot's `DockerService` writes `.conf` files into `conf.d/` at runtime whenever it starts a preview container for a project or branch. Each file looks like:

```nginx
location /preview/{projectId}/ {
    proxy_pass http://{container_name}:{port}/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

The `conf.d/` directory is mounted as a Docker volume shared between the Nginx container and the host, so Spring Boot (running in the `backend` container) can write there without restarting Nginx.

---

## docker-compose.yml Integration

```yaml
nginx:
  build:
    context: ./nginx
    dockerfile: Dockerfile
  volumes:
    - ./nginx/conf.d:/etc/nginx/conf.d   # shared with backend
  ports:
    - "8080:8080"
  depends_on:
    - backend
```

All containers share the `codemax_network` bridge network (`docker-compose.yml` sets `networks.default.name: codemax_network`), so Nginx can proxy to any container by its service name or container name.

---

## Adding a New Preview Route

When Spring Boot starts a project preview container:
1. `DockerService` starts a `node:20-alpine` container on a random port (4000–5000) in `codemax_network`
2. `DockerService` writes `/etc/nginx/conf.d/preview_{projectId}.conf` with a `location` block pointing to the container
3. Nginx picks up the new `.conf` on the next request (or after a `nginx -s reload` signal)

When a preview is stopped:
1. `DockerService` stops/removes the container
2. `DockerService` deletes the `.conf` file
3. Requests to that preview path return 404

---

## Worker (commented out)

The `worker` service in `docker-compose.yml` is currently commented out — the AI pipeline is not yet fully implemented. When enabled, the worker also needs access to `codemax_network` and the Docker socket to start preview containers.
