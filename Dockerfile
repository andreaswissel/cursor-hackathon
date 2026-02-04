# Dockerfile for Railway - API service with ffmpeg
FROM oven/bun:1

# Install ffmpeg via apt (pre-built binary, no compilation needed)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files and tsconfig
COPY package.json bun.lock tsconfig.base.json ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN bun install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build shared types (api imports from shared)
RUN cd packages/shared && bun run build

# Set working directory to api
WORKDIR /app/packages/api

# Expose port
EXPOSE 3001

# Run TypeScript directly (Bun handles it natively)
CMD ["bun", "src/index.ts"]
