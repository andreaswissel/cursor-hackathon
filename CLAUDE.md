# CLAUDE.md — Product OS Engineering Notes

This file is for coding agents and contributors who want a compact map of the repository.

## Stack

- Runtime: Bun
- Backend: Express + TypeScript
- Frontend: React 18 + Vite + Tailwind CSS
- Database: PostgreSQL + Drizzle ORM
- AI providers: Anthropic, OpenAI, Google Gemini
- Optional sandbox: E2B with local fallback

## Packages

- `packages/api` — routes, agents, integrations, database, sandbox implementations
- `packages/web` — application UI, settings, integrations panel, session flows
- `packages/shared` — shared types used by API and web
- `packages/desktop` — optional Tauri shell for desktop experiments

## Commands

```bash
# Install
bun install

# Development
bun run dev
bun run dev:api
bun run dev:web

# Validation
bun run check

# Database
bun run db:generate
bun run db:migrate
bun run db:studio
```

## Local Defaults

- Web dev server runs on `http://localhost:5173`
- API server runs on `http://localhost:3001`
- Local Postgres quickstart uses `docker-compose.yml` on port `5434`
- Vite proxies `/api` to the local API during development, so no web env file is required for the default setup

## Important Patterns

- API routes live in `packages/api/src/routes`
- Integration adapters live in `packages/api/src/integrations`
- Shared env-backed secrets are encrypted with `DATA_ENCRYPTION_KEY` or `JWT_SECRET`
- Google login and Google Workspace integration use separate callback paths
- If `E2B_API_KEY` is unset, Flow code/review work falls back to the local sandbox

## Setup Docs

- [README.md](README.md)
- [docs/setup.md](docs/setup.md)
- [docs/integrations.md](docs/integrations.md)
- [docs/e2b.md](docs/e2b.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
