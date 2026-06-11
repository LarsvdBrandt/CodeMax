# ─────────────────────────────────────────────────────────────────────────────
# Backend Dockerfile — multi-stage (dev + prod)
#
# Stages:
#   dev  → ts-node + nodemon for hot-reload (docker-compose default)
#   prod → compiled JS, no dev dependencies (lean production image)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development stage ─────────────────────────────────────────────────────────
FROM base AS dev
RUN npm ci --prefer-offline
COPY . .
EXPOSE ${BACKEND_INTERNAL_PORT:-3000}
CMD ["npm", "run", "dev"]

# ── Build stage ───────────────────────────────────────────────────────────────
FROM base AS build
RUN npm ci --prefer-offline
COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
COPY package*.json ./
# Install only production deps
RUN npm ci --omit=dev --prefer-offline
COPY --from=build /app/dist ./dist
EXPOSE ${BACKEND_INTERNAL_PORT:-3000}
CMD ["npm", "run", "start"]
