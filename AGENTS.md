# AGENTS.md — Product OS Contributor Context

This repository hosts Product OS, an agent-native product management workbench built as a Bun monorepo.

## Product Overview

Product OS helps teams turn ideas into validated product work through a coordinated agent pipeline:

1. Discovery
2. Strategy
3. Spec
4. GTM
5. Product Marketing

Projects are the top-level organizing unit. Sessions, docs, and follow-up work live inside a project, with an automatic Drafts project for ungrouped work.

## Repo Shape

- `packages/api` — Express API, agents, integrations, database access
- `packages/web` — React + Vite frontend
- `packages/shared` — shared types/constants
- `packages/desktop` — optional Tauri desktop shell

## Contributor Workflow

- Use Bun workspace commands from [README.md](README.md) and [docs/setup.md](docs/setup.md).
- Run `bun run check` before you consider a change complete.
- Keep `packages/api/.env.example` in sync with any new or changed runtime configuration.
- Treat third-party connectors and E2B as optional features: the app should still boot locally without them.
- If you change user-facing UI, validate it in a browser before wrapping up.
- Never commit secrets, private credentials, or personal service defaults.

## Docs To Trust First

- [README.md](README.md) — quickstart
- [docs/setup.md](docs/setup.md) — full local setup
- [docs/integrations.md](docs/integrations.md) — connector setup
- [docs/e2b.md](docs/e2b.md) — E2B and sandbox behavior
- [docs/troubleshooting.md](docs/troubleshooting.md) — common setup failures
