# Changelog

All notable changes to Product OS are documented here.

## [2026-02-12]

### Features

- **Tools Marketplace** — New `/tools` hub consolidating Documents, Roadmap, and two new AI-powered tools: Guided Tours (product tour designer) and Feedback Forms (survey/form designer)
- **Changelog** — Public `/changelog` page accessible without authentication

### Improvements

- **Flow chat UX** — Replace agent button row with + popup menu in chat thread; move + button inside textarea container to match ChatGPT layout

## [2026-02-11]

### Features

- **Flow Mode** — Continuous chat with artifacts and specialized agents
- **Enhanced Flow Mode** — All agent triggers, collapsible thinking, changelog agent, and context menu
- **Zero-friction Flow Mode entry** — LLM-powered title generation and project-level repo URLs
- **AgentSandbox** — Code and Review agents with tool-use loop for Flow Mode
- **Roadmap** — Global Gantt-style timeline for planning features across quarters
- **Privacy & Compliance** — Inline privacy policy, DPA, and subprocessors list
- **Intercom Integration** — Customer conversation sync adapter

### Fixes

- **CORS** — Allow `X-Team-Id` header in preflight responses
- **Build** — Include `codingPrompt` prop in handoff components
- **Flow page** — Center send button and add @ context menu popup
- **Sidebar** — Move Flow nav item to first position

## [2026-02-10]

### Features

- **Discover** — Discovery page with CTA buttons, backend API, and real data source selector
- **Imagine** — New Imagine page with file import, terminal panel, and UI improvements
- **Projects** — Projects as primary organizational unit for grouping sessions
- **Onboarding** — Multi-step onboarding wizard for new users
- **Teams & Roles** — Teams, user profiles, and role-based access with invite flows
- **Knowledge Sources** — Project-scoped knowledge with inheritance and AI summarization
- **Move-to-Team UI** — Transfer projects between personal and team workspaces
- **Admin User Management** — User management panel in settings page
- **Privacy Notices** — Layered privacy notices with low-friction UX
- **Desktop App** — Tauri desktop app CORS support

### Fixes

- **Dark mode** — Fix heading colors in markdown prose containers
- **Onboarding** — Fix tool links redirecting to step 1
