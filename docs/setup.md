# Setup Guide

This guide is the canonical local development path for Product OS.

## Prerequisites

- Bun 1.3+
- Docker Desktop or another Docker-compatible runtime
- Git

Optional:

- An Anthropic, OpenAI, or Gemini API key
- OAuth apps for any connectors you want to test locally
- An E2B API key if you want cloud sandboxes for Flow code/review work

## Recommended Local Path: Docker Postgres

### 1. Install dependencies

```bash
bun install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts a local PostgreSQL 16 instance with:

- Host: `localhost`
- Port: `5434`
- Database: `product_os`
- User: `product_os`
- Password: `product_os`

### 3. Create your API env file

```bash
cp packages/api/.env.example packages/api/.env
```

For the default local setup, keep or set these values:

```bash
DATABASE_URL=postgresql://product_os:product_os@localhost:5434/product_os
JWT_SECRET=change-me-in-local-dev
DATA_ENCRYPTION_KEY=change-me-too
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

Notes:

- `packages/api/.env.example` is the source of truth for supported API env vars.
- You do not need a web env file for the default local dev flow. Vite proxies `/api` to `http://localhost:3001`.
- You can leave connector and E2B vars blank until you want those features.

### 4. Apply database migrations

```bash
bun run db:migrate
```

### 5. Start the app

```bash
bun run dev
```

This starts:

- API on `http://localhost:3001`
- Web on `http://localhost:5173`

### 6. Sign in locally

Open `http://localhost:5173` and use the email login flow.

Local development does not require Google sign-in. If you do not configure Google OAuth, the email login flow is still available.

### 7. Add an AI provider key

You need at least one working model provider to run agent workflows.

You have two options:

1. Put `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` in `packages/api/.env`
2. Leave env keys blank and add a user-specific key in Settings after signing in

The app can boot without provider keys, but agent runs will fail until at least one provider key exists somewhere.

## Advanced Local Path: External PostgreSQL / Neon

If you prefer a managed database:

1. Create a PostgreSQL database
2. Set `DATABASE_URL` in `packages/api/.env`
3. Run `bun run db:migrate`
4. Start the app with `bun run dev`

Everything else stays the same.

## Validation Checklist

Run these before opening a PR:

```bash
bun run check
```

Then verify:

- `http://localhost:5173` loads
- you can sign in locally
- Settings loads
- agent runs work once a provider key is configured

## Optional Local Features

- Connectors: [integrations.md](integrations.md)
- E2B cloud sandboxes: [e2b.md](e2b.md)
- Desktop shell: `packages/desktop` (experimental)

## Common Next Steps

- Want OAuth connectors? Start with [integrations.md](integrations.md)
- Want cloud-isolated code/review sandboxes? Use [e2b.md](e2b.md)
- Hit a setup snag? Check [troubleshooting.md](troubleshooting.md)
