# ==========================================
# Standalone Backend Dockerfile
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY src/db/migrations ./dist/db/migrations

EXPOSE 3000
CMD ["node", "dist/server.js"]
