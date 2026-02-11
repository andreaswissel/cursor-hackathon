# Changelog

All notable changes to Product OS are documented here.

## [2026-02-12]

### Features

- **Salesforce Integration** — New integration adapter to import sales feedback from Cases, Opportunities, Leads, and Contacts via OAuth with refresh token support
- **New Flow in Project** — Start a Flow session directly from a project via hover action button in the sidebar
- **Tools Marketplace** — New `/tools` hub consolidating Documents, Roadmap, and two new AI-powered tools: Guided Tours (product tour designer) and Feedback Forms (survey/form designer)
- **Changelog** — Public `/changelog` page accessible without authentication

### Improvements

- **Home page redesign** — Vertical layout with visual preview mockups for each mode (Flow, Imagine, Tools, Discover) showing what the UI looks like before clicking through
- **Sidebar project names** — Show full project name on hover tooltip, use more space for text, align session count to the right; session names also get tooltips
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
