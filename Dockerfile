# ==========================================
# Unified Multi-Stage Dockerfile
# Builds both Frontend (Angular) and Backend (Node.js/Express)
# ==========================================

# ------------------------------------------
# Stage 1: Build Angular Frontend
# ------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------
# Stage 2: Build Express Backend
# ------------------------------------------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json backend/tsconfig.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY backend/src ./src
RUN npm run build

# ------------------------------------------
# Stage 3: Production Runtime
# ------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY backend/src/db/migrations ./dist/db/migrations

# Copy compiled frontend into public folder for unified static delivery
COPY --from=frontend-builder /app/frontend/dist/recharge-panel/browser ./public

EXPOSE 3000

CMD ["node", "dist/server.js"]
