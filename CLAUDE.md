# CLAUDE.md — Product OS

## Project Overview

Product OS is a multi-agent AI product management platform. Users submit product ideas which are processed through a pipeline of specialized AI agents (Discovery → Strategy → Spec → GTM → Product Marketing). It also supports video-driven documentation generation.

**Projects** are the primary organizational unit. A project groups related sessions (idea-to-spec chats, docs, discovery research). Every user gets an automatic "Untitled Project" for ungrouped work.

## Architecture

**Monorepo** using Bun workspaces with three packages:

- `packages/api` — Express.js backend with AI agent orchestration
- `packages/web` — React 18 + Vite frontend
- `packages/shared` — Shared TypeScript types and constants

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Backend | Express.js 4.21, TypeScript 5.3 |
| Frontend | React 18, Vite 5, TypeScript 5.3 |
| Styling | Tailwind CSS 3 + CSS variables (HSL), shadcn/ui pattern (CVA + Radix UI) |
| Database | PostgreSQL 16 (Neon hosted), Drizzle ORM |
| Auth | JWT (jsonwebtoken) + Google OAuth |
| AI | Anthropic SDK, OpenAI SDK, Google Generative AI |
| Deployment | Docker, Railway (nixpacks) |

## Commands

```bash
# Development
bun run dev              # Start API + Web concurrently
bun run dev:api          # API only (port 3001)
bun run dev:web          # Web only (port 5173)

# Build
bun run build            # Build all packages
bun run build:api        # Build API (builds shared first)
bun run build:web        # Build Web (builds shared first)

# Database
bun run db:generate      # Generate Drizzle migration files
bun run db:migrate       # Apply migrations
bun run db:studio        # Open Drizzle Studio

# Docker (production only, not needed for local dev)
docker compose up -d     # Start local PostgreSQL if needed (port 5434)
```

## Coding Standards

### General

- **Language:** TypeScript everywhere — strict mode enabled
- **Package manager:** Bun only (never npm/yarn/pnpm)
- **No ESLint/Prettier configured** — follow existing code style

### Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Files (all packages) | kebab-case | `session-store.ts`, `auth-context.tsx` |
| React components | PascalCase export | `Button`, `AgentPanel` |
| Functions/variables | camelCase | `buildMessages()`, `sessionStore` |
| Database columns | snake_case | `created_at`, `user_id` |
| Types/interfaces | PascalCase | `AgentInput`, `SessionContext` |
| Agent classes | PascalCase with suffix | `DiscoveryAgent`, `BaseAgent` |
| Project helpers | camelCase | `ensureDefaultProject()` |

### Frontend (packages/web)

- **Components** go in `src/components/` — one component per file
- **Pages** go in `src/pages/` — mapped to routes in `main.tsx`
- **Hooks** go in `src/hooks/` — prefix with `use-`
- **Contexts** go in `src/contexts/`
- **Path alias:** `@/` maps to `src/`
- **Utility function:** use `cn()` from `@/lib/utils` for merging Tailwind classes (clsx + tailwind-merge)
- **Component pattern:** shadcn/ui style — CVA variants, forwardRef, Radix UI primitives
- **State management:** React Context for auth, component-level useState, custom hooks for SSE streams
- **API calls:** plain `fetch()` with Bearer token — no Axios or React Query
- **Styling:** Tailwind utility classes only. Use semantic color tokens (`bg-primary`, `text-muted-foreground`, etc.) — never raw color values. Dark mode via `class` strategy.
- **Icons:** Lucide React
- **Markdown rendering:** react-markdown

### Backend (packages/api)

- **Agents** go in `src/agents/` — extend `BaseAgent` abstract class
- **Routes** go in `src/routes/` — Express Router pattern
- **Middleware** goes in `src/middleware/`
- **Libraries/utilities** go in `src/lib/`
- **Database schema** defined in `src/db/schema.ts` using Drizzle ORM
- **Agent pattern:** each agent implements `systemPrompt`, `buildMessages()`, `parseOutput()`, and inherits `run()` from BaseAgent
- **LLM calls:** use `streamCompletion()` from `src/lib/claude.ts` or the multi-provider `src/lib/llm.ts`
- **Real-time updates:** SSE via `sessionStore` event emitter — never polling
- **Validation:** Zod schemas where applicable
- **IDs:** UUID v4 for all primary keys

### Shared (packages/shared)

- Types and constants shared between API and Web
- Import as `@product-os/shared`
- Build shared before API or Web (`bun run build` handles this)

## Database

- **ORM:** Drizzle with PostgreSQL dialect
- **Schema location:** `packages/api/src/db/schema.ts`
- **Migrations:** `packages/api/drizzle/` — generated via `bun run db:generate`
- **Key tables:** `users`, `projects` (org unit), `sessions` (has `project_id` FK), `agent_runs`, `outputs`, `messages`, `documentation_pieces`
- **JSONB columns** for flexible nested data (context, metadata, logs, refinementHistory)
- **Config:** `packages/api/drizzle.config.ts` — reads `DATABASE_URL` from env
- **Hosted:** Neon PostgreSQL — no Docker needed for local dev. `DATABASE_URL` in `.env` points to Neon.
- **Docker Compose** available for optional local PostgreSQL (port 5434) but not required

## Key Patterns

### Agent Orchestration
The `OrchestratorAgent` runs agents sequentially through phases. Each agent streams logs via SSE to the frontend in real-time. The `sessionStore` acts as an in-memory cache with event emission, backed by PostgreSQL persistence.

### SSE Streaming
Frontend subscribes to `/api/sessions/{id}/stream` using EventSource. The custom `useSessionStream` hook processes typed events (`agent:init`, `agent:log`, `agent:status`, `agent:output`, `session:status`, etc.) and updates React state.

### Integration Adapters
External services (Jira, Slack, Notion, Airtable, Google) follow a standardized adapter interface with OAuth flow, token management, and data sync. Cached data stored in `integrationData` table.

## Environment Variables

Key env vars needed for the API:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `ANTHROPIC_API_KEY` — Default Claude API key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth
- `VITE_API_URL` — Frontend API base URL (build-time)

## Skills & Workflow Requirements

### UI Development — frontend-design skill

When building or modifying any frontend UI (components, pages, layouts, styling):

1. **Always use the `frontend-design` skill** before writing UI code
2. This ensures designs follow modern UI/UX best practices, are consistent with the existing shadcn/ui + Tailwind pattern, and produce polished, production-quality interfaces
3. Apply the skill for: new components, page layouts, redesigns, styling changes, responsive adjustments, and any visual work

### Browser Validation — agent-browser skill

After implementing any user-facing feature or UI change:

1. **Always use the `agent-browser` skill** to validate the feature in a real browser
2. Verify the feature works end-to-end: renders correctly, interactions work, no console errors
3. This applies to: new features, bug fixes, UI changes, routing changes, and any modification that affects what users see or interact with
4. Do not consider a frontend task complete until it has been validated in the browser
