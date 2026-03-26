# Product OS

Product OS is an agent-native product management workbench. It helps teams turn ideas into discovery research, strategic framing, detailed specs, and launch materials through a coordinated multi-agent workflow.

## What You Get

- Multi-agent product workflow: Discovery, Strategy, Spec, GTM, and Product Marketing
- Project-based organization for sessions, docs, and follow-up work
- Real-time streaming updates from long-running agent work
- Optional third-party data connectors for feedback, tickets, docs, and sales context
- Optional Flow code/review mode with E2B-backed cloud sandboxes or a local fallback

## Repository Layout

- `packages/api` — Express API, agents, database access, integrations, sandbox logic
- `packages/web` — React + Vite application
- `packages/shared` — shared types/constants
- `packages/desktop` — experimental Tauri desktop shell

## 5-Minute Quickstart

### Prerequisites

- Bun 1.3+
- Docker Desktop or another Docker-compatible runtime
- Git

### 1. Clone and install

```bash
git clone https://github.com/andreaswissel/product-os.git
cd product-os
bun install
```

### 2. Start local Postgres

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5434`.

### 3. Create your local API env file

```bash
cp packages/api/.env.example packages/api/.env
```

The default `.env.example` is already set up for the local Docker database. For a minimal local boot, make sure these values exist:

```bash
DATABASE_URL=postgresql://product_os:product_os@localhost:5434/product_os
JWT_SECRET=change-me-in-local-dev
DATA_ENCRYPTION_KEY=change-me-too
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

You can leave third-party connector vars blank for now.

### 4. Apply migrations and start the app

```bash
bun run db:migrate
bun run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

### 5. Sign in and add an AI key

- Open `http://localhost:5173`
- Use the email login flow for local development
- Add an Anthropic, OpenAI, or Gemini key in Settings, or provide one through `packages/api/.env`

The app can boot without provider keys, but agent runs need either env-level keys or user-provided keys in Settings.

## Local Development Commands

```bash
bun run dev
bun run dev:api
bun run dev:web
bun run build
bun run check
bun run db:migrate
bun run db:studio
```

## Setup Guides

- [Full setup guide](docs/setup.md)
- [Connector setup guide](docs/integrations.md)
- [E2B sandbox guide](docs/e2b.md)
- [Troubleshooting guide](docs/troubleshooting.md)
- [Docs index](docs/README.md)

## Optional Features

### Third-party connectors

Product OS can optionally connect to:

- Google Workspace
- Jira
- Slack
- Notion
- Airtable
- Intercom
- Salesforce

See [docs/integrations.md](docs/integrations.md) for required env vars, callback URLs, and provider-side setup steps.

### E2B cloud sandboxes

Set `E2B_API_KEY` to run Flow code/review work in isolated cloud sandboxes. If you leave it unset, Product OS falls back to the local sandbox automatically.

See [docs/e2b.md](docs/e2b.md) for details and current private-repo limitations.

### Desktop app

`packages/desktop` contains an experimental Tauri shell. The web + API workflow is the primary supported setup for contributors; treat the desktop app as optional.

## Contributing

- Read [CONTRIBUTING.md](CONTRIBUTING.md)
- Run `bun run check` before opening a PR
- Keep `packages/api/.env.example` in sync with runtime changes
- Do not commit secrets, private credentials, or customer data

## License

[Apache-2.0](LICENSE)
