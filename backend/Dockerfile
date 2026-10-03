FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace dependencies definitions
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Install dependencies for backend
RUN pnpm install --filter backend...

# Copy backend source code explicitly
COPY backend/src ./backend/src
COPY backend/drizzle ./backend/drizzle
COPY backend/drizzle.config.ts ./backend/
COPY backend/tsconfig.json ./backend/

WORKDIR /app/backend

# Ensure uploads directory exists
RUN mkdir -p uploads

EXPOSE 3333

CMD ["pnpm", "start"]
