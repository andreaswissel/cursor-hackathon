# AGENTS.md — Product OS Vision

## What is Product OS?

Product OS is an **agent-native product management workbench**. It is the single place where product managers scope, execute, and track product work — powered by a pipeline of specialized AI agents.

## Core Concept: Projects as the Organizational Unit

A **Project** groups related sessions (idea-to-spec chats, documentation, discovery research) into a cohesive body of work. Projects are the primary navigation and grouping layer in the sidebar.

- Every user gets an automatic "Untitled Project" for ungrouped work
- Sessions are always nested under a project
- Projects can be renamed, deleted (sessions reassign to Untitled), and created freely

## Multi-Agent Pipeline

Each session runs through a pipeline of specialized agents:

1. **Discovery Agent** — Validates the idea against customer feedback, market signals, and pain points
2. **Strategy Agent** — Evaluates OKR alignment, strategic fit, and priority trade-offs
3. **Spec Agent** — Generates a detailed product specification with acceptance criteria
4. **GTM Agent** — Creates go-to-market communications and launch materials
5. **Product Marketing Agent** — Drafts internal product updates for Teams/Slack

The **Orchestrator Agent** coordinates the pipeline, passing outputs between agents and handling user interactions (e.g., proceeding despite strategy rejection).

## Integration Strategy

Product OS is designed to be the central hub that connects to existing tools:

| Category | Tools | Purpose |
|----------|-------|---------|
| Project Tracking | Jira, Linear | Sync specs to tickets, track implementation |
| Communication | Slack, Teams | Push product updates, collect feedback signals |
| Documentation | Google Workspace, Notion | Export specs, import context docs |
| Data | Airtable | Import structured feedback, OKRs |

The goal: **never leave Product OS** for product scoping work. All context flows in, all outputs flow out.

## Architecture

- **Monorepo**: Bun workspaces (api + web + shared)
- **Real-time**: SSE streaming from agents to frontend
- **Persistence**: PostgreSQL (Neon) with Drizzle ORM
- **Session Store**: In-memory cache backed by PostgreSQL, with event emission for SSE
