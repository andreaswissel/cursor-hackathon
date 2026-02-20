# Changelog

All notable changes to Product OS are documented here.

## [2026-02-20]

### Features

- **Public demo launch mode** — Added `PUBLIC_DEMO_MODE` controls that lock external integrations server-side for public users while preserving internal/admin bypass access.

### Fixes

- **Drafts bootstrap for legacy users** — The projects API now always ensures each user has a personal `Drafts` project and backfills legacy sessions with `NULL project_id` so users no longer get stuck on a perpetual “Loading projects...” state.

- **OAuth redirect mismatch resilience (Google + Notion)** — Added normalized `API_BASE_URL` fallback redirect URIs for integration OAuth callbacks to prevent `redirect_uri_mismatch` when provider-specific env vars are missing.

- **Reconnect warning noise reduction** — Session reconnect banner now appears only after a sustained disconnect (4 seconds), eliminating sub-second flicker notifications during transient SSE hiccups.

- **Dropdown layering and clipping** — Fixed custom dropdown menus being cut off or rendered behind nearby cards by removing clipping overflow from the outputs handoff wrapper and standardizing higher z-index layers for custom dropdown anchors/menus.

- **Flow inline `@/$/#` popup rendering** — Converted the context popup to a true floating overlay (`position: fixed`) with higher layering and refined popover styling, removing the “inline embedded” look and preventing composer-line visual collisions.

- **Integration data access lockdown in demo mode** — Discovery and knowledge resolution now ignore live integration data for public-demo users when integrations are disabled, preventing accidental leakage of synced external data.

### Improvements

- **Outputs handoff panel redesign** — Reworked the “Ready to Build” actions into a clearer two-path handoff (Flow vs coding agent), and toned down the visual treatment to fit dark mode.

- **Dark scrollbar theming** — Replaced bright/system-looking scrollbar rails with explicit app-matched dark track/thumb tokens for a calmer, consistent UI.

- **Waitlist signup minimization** — Waitlist now requires only email, with optional name and company fields for lower-friction and reduced PII collection.

- **Discovery realism** — Removed scripted discovery cluster fallback responses so dashboard insights are always produced by real model runs.

## [2026-02-13]

### Improvements

- **Landing Page — Dark Theme** — Converted the entire landing page from light/cream to a permanent dark theme. All backgrounds use dark grays (#0a0a0a, #111111, #1a1a1a), text is white/light gray, navbar scrolled state is dark with inverted CTA, and accent colors (violet, amber, emerald, purple) are preserved. App mockup cards inside bento grid and feature sections remain light-themed.

- **Landing Page — Bento Grid & Copy Refresh** — Added Dreelio-inspired bento feature grid with two large mockup cards and three icon cards in warm cream styling. Removed serif display font (Instrument Serif) in favour of DM Sans for all headings. Updated all landing page copy to focus on the "operating system for product managers" proposition — idea to MVP in minutes, eliminate busywork, focus on decisions that move the needle. Feature deep-dive sections restyled with warm cream card wrappers.

- **Landing Page Redesign** — Dreelio-inspired premium redesign with cream/off-white backgrounds, floating pill navbar that transitions on scroll, second hero section with large app screenshot mockup, social proof bar with 8 integration icons, alternating feature sections with slide-in animations, staggered how-it-works cards, testimonial quote section, blue gradient CTA, and footer in a card. Light-mode only with hardcoded colors.

## [2026-02-12]

### Features

- **Stop Running Agents** — Added a stop button to cancel agents (@Code, @Review, etc.) while they're running in flow mode. Clicking stop immediately ends the SSE stream and re-enables the input area.

- **E2B Cloud Sandbox** — Code and review agents now run in isolated E2B cloud sandboxes (Firecracker microVMs) instead of executing commands directly on the API server. Automatically falls back to local sandbox when `E2B_API_KEY` is not set.

- **Admin Waitlist Management** — Admin page at `/admin` to view, approve, and reject waitlist signups. Includes API endpoints (`GET /admin/waitlist`, `PATCH /admin/waitlist/:id`) protected by admin middleware.

- **Full-screen Video Hero** — Landing page opens with a full-viewport typographic animation ("anyone can be a PM.") with scroll indicator to reveal the rest of the page
- **Real Brand Icons** — Replaced generic Lucide icons with official brand SVGs (Airtable, Jira, Notion, Google, Slack, Intercom, Salesforce, Linear) across integrations panel, landing page, and onboarding
- **Legal Compliance** — Added Impressum (DDG §5), Terms of Service, GDPR legal basis mapping in Privacy Policy, and privacy/terms consent on waitlist form. Standardized contact email to hello@andreaswissel.com.
- **Waitlist** — Beta signup waitlist at `/waitlist` with name, email, role, and use-case collection. Landing page CTAs now point to the waitlist instead of direct signup. Existing users can still sign in via `/login`.
- **Landing Page** — Public marketing landing page at `/` for unauthenticated visitors with hero, feature showcase, how it works, integrations, and CTA sections. Authenticated users still see the home dashboard.
- **Salesforce Integration** — New integration adapter to import sales feedback from Cases, Opportunities, Leads, and Contacts via OAuth with refresh token support
- **New Flow in Project** — Start a Flow session directly from a project via hover action button in the sidebar
- **Tools Marketplace** — New `/tools` hub consolidating Documents, Roadmap, and two new AI-powered tools: Guided Tours (product tour designer) and Feedback Forms (survey/form designer)
- **Changelog** — Public `/changelog` page accessible without authentication

### Fixes

- **Flow agent messages persist on refresh** — `@Code`, `@Review`, and other agent commands now persist their completion summary to the database so messages survive page refresh. Thinking blocks are reconstructed at the correct position (after the triggering user message) instead of at the end of the thread. All agent types (including pipeline agents like Discovery, Strategy, Spec, GTM, Marketing) are now supported in reconstruction.

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
