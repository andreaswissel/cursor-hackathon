# Dockerfile for Railway - API service with ffmpeg
FROM oven/bun:1

# Install ffmpeg via apt (pre-built binary, no compilation needed)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN bun install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build shared first, then api
RUN cd packages/shared && bun run build
RUN cd packages/api && bun run build

# Set working directory to api
WORKDIR /app/packages/api

# Expose port
EXPOSE 3001

# Start the server
CMD ["bun", "run", "start"]
