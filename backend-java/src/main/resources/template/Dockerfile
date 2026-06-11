# ─────────────────────────────────────────────────────────────────────────────
# Frontend Dockerfile — multi-stage (dev + prod)
#
# Stages:
#   dev  → Vite dev server with hot-reload (used by docker-compose default)
#   prod → Static build served by nginx (used for production deployments)
#
# Build target is set via DOCKER_TARGET in .env (default: dev).
# docker-compose passes --target ${DOCKER_TARGET} automatically.
# ─────────────────────────────────────────────────────────────────────────────

# ── Base: shared node setup ───────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline

# ── Development stage ─────────────────────────────────────────────────────────
FROM base AS dev
COPY . .
# Port is injected via VITE_PORT env var (set in docker-compose → vite.config.ts)
EXPOSE ${FRONTEND_INTERNAL_PORT:-5173}
CMD ["npm", "run", "dev"]

# ── Build stage ───────────────────────────────────────────────────────────────
FROM base AS build
COPY . .
# All VITE_ env vars must be present at build time — pass them via --build-arg
# or use docker-compose build + env_file.
RUN npm run build

# ── Production stage (nginx) ──────────────────────────────────────────────────
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
# nginx config that handles SPA routing (all paths → index.html)
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
