# Product OS

> AI-powered product management workflow that turns ideas into specs, strategies, and launch materials using specialized agents

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, React Markdown
- **Backend**: Node.js, Express, Bun runtime
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: Claude (Anthropic) for all agent reasoning
- **Hosting**: Railway (API + Web + PostgreSQL)
- **Integrations**: Google OAuth, Google Slides API, Google Drive API, Jira Cloud, Slack

## How to Run

```bash
# Clone the repo
git clone https://github.com/andreaswissel/cursor-hackathon.git
cd cursor-hackathon

# Install dependencies (requires Bun)
bun install

# Set up environment variables
cp packages/api/.env.example packages/api/.env
# Add your API keys to .env (see Environment Variables below)

# Run database migrations
bun run db:migrate

# Run the development server (both API and web)
bun run dev

# Or run separately:
bun run dev:api  # API on http://localhost:3001
bun run dev:web  # Web on http://localhost:5173
```

## Environment Variables

Create a `.env` file in `packages/api/` with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/product_os

# Auth
JWT_SECRET=your-jwt-secret

# Claude AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google OAuth (for login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_AUTH_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Google Integration (for Slides/Drive)
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/callback/google

# Jira Integration (optional)
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_REDIRECT_URI=http://localhost:3001/api/integrations/callback/jira

# Slack Integration (optional)
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/api/integrations/callback/slack

# URLs
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# Public launch mode (optional)
PUBLIC_DEMO_MODE=true
# Comma-separated providers allowed in demo mode (default: none)
PUBLIC_DEMO_ENABLED_INTEGRATIONS=
# Comma-separated internal bypass accounts
PUBLIC_DEMO_INTERNAL_EMAILS=founder@company.com
PUBLIC_DEMO_INTERNAL_USER_IDS=
```

## Project Structure

```
packages/
├── api/          # Express backend with agents
│   └── src/
│       ├── agents/        # AI agents (discovery, strategy, spec, gtm, product-marketing)
│       ├── db/            # Drizzle schema and migrations
│       ├── integrations/  # Google, Jira, Slack adapters
│       ├── lib/           # Claude client, session store, slides generator
│       ├── middleware/    # Auth, rate limiting
│       └── routes/        # API endpoints
├── web/          # React frontend
│   └── src/
│       ├── components/    # UI components
│       ├── contexts/      # Auth context
│       ├── hooks/         # Session streaming hook
│       └── pages/         # Routes (home, session, login, settings)
└── shared/       # Shared types between API and web
```

## Features

- **Multi-agent workflow**: Orchestrator coordinates Discovery, Strategy, Spec, GTM, and Product Marketing agents
- **Real-time streaming**: SSE-based live updates as agents work
- **Agent iteration**: Chat with individual agents to refine their outputs
- **Google Slides generation**: Automatically creates presentation decks from agent outputs
- **Integrations**: Connect Jira and Slack to pull customer feedback and OKRs
- **Cursor handoff**: One-click export to Cursor for implementation
