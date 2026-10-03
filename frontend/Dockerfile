FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy root workspace definitions
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --filter frontend...

# Copy frontend source code explicitly (never copy host node_modules or .next)
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/next.config.ts ./frontend/
COPY frontend/tailwind.config.ts ./frontend/
COPY frontend/postcss.config.mjs ./frontend/
COPY frontend/tsconfig.json ./frontend/

# Environment variable argument for production build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api/v1}

# Build Next.js application (standalone mode)
RUN pnpm --filter frontend build

# Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build
COPY --from=base /app/frontend/.next/standalone ./
COPY --from=base /app/frontend/.next/static ./frontend/.next/static
COPY --from=base /app/frontend/.next/static ./.next/static
COPY --from=base /app/frontend/public ./frontend/public
COPY --from=base /app/frontend/public ./public

EXPOSE 3000

# Handle both root server.js and monorepo frontend/server.js
CMD ["sh", "-c", "if [ -f frontend/server.js ]; then node frontend/server.js; else node server.js; fi"]
