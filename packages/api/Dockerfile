# Dockerfile for Railway deployment with ffmpeg
FROM oven/bun:1 AS base

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build
WORKDIR /app/packages/api
RUN bun run build

# Expose port
EXPOSE 3001

# Start
CMD ["bun", "run", "start"]
