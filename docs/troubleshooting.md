# Troubleshooting

## `bun install` or `bun run build` fails

Try these first:

```bash
bun install
bun run check
```

If the web build complains about missing workspace packages, re-run `bun install` from the repo root so Bun can restore the expected workspace links.

## The app loads but agent runs fail immediately

Product OS needs at least one AI provider key for agent work.

Fix options:

- add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` to `packages/api/.env`
- or sign in and add a provider key in Settings

## Database connection errors

If you are using the recommended local Docker database:

```bash
docker compose up -d
```

Then confirm `packages/api/.env` contains:

```bash
DATABASE_URL=postgresql://product_os:product_os@localhost:5434/product_os
```

If you are using an external database, make sure `DATABASE_URL` points to that database instead.

## Google redirect mismatch

Google login and Google Workspace integration use different callback URLs:

- Login: `http://localhost:3001/api/auth/google/callback`
- Workspace integration: `http://localhost:3001/api/integrations/callback/google`

If you use both locally, the same Google OAuth app must allow both redirect URIs.

## Other connector redirect mismatch errors

For Jira, Slack, Notion, Airtable, Intercom, and Salesforce:

- check the exact callback URL in [integrations.md](integrations.md)
- make sure the provider-side app uses the same URL character-for-character
- restart the API after changing env vars

## An integration is missing or disabled

Check `PUBLIC_DEMO_MODE` in `packages/api/.env`.

If `PUBLIC_DEMO_MODE=true`, integrations can be hidden or locked depending on:

- `PUBLIC_DEMO_ENABLED_INTEGRATIONS`
- `PUBLIC_DEMO_INTERNAL_EMAILS`
- `PUBLIC_DEMO_INTERNAL_USER_IDS`

For normal local development, leave `PUBLIC_DEMO_MODE=false`.

## E2B is configured but Flow still fails

Check these:

- `E2B_API_KEY` is set in `packages/api/.env`
- you restarted the API after changing env vars
- the target repo is public if the flow needs sandbox cloning

If you do not want to troubleshoot E2B right now, remove `E2B_API_KEY` and use the local fallback sandbox.

## I want to test the app without connectors

That is supported.

Use:

- the email login flow
- a local or managed PostgreSQL database
- at least one provider API key

You can leave every connector env var blank.

## The web app is pointing at the wrong API in production-like builds

Local dev does not require a web env file because Vite proxies `/api` to `http://localhost:3001`.

If you are doing a non-local build or deploy, set `VITE_API_URL` for the web build environment.
