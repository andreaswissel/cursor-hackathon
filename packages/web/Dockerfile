# Dockerfile for Railway - Web frontend
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy root package files
COPY package.json bun.lock tsconfig.base.json ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN bun install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Build shared types first
RUN cd packages/shared && bun run build

# Build web app
RUN cd packages/web && bun run build

# Production stage - serve static files
FROM oven/bun:1

WORKDIR /app

# Install serve globally
RUN bun add -g serve

# Copy built assets from builder
COPY --from=builder /app/packages/web/dist ./dist

EXPOSE 3000

CMD ["serve", "dist", "-s", "-l", "tcp://0.0.0.0:3000"]
