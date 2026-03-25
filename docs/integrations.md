# Integrations Guide

All connectors in Product OS are optional. You can run the app locally without any of them.

## Before You Start

- Copy `packages/api/.env.example` to `packages/api/.env`
- Set `API_BASE_URL=http://localhost:3001`
- Set `FRONTEND_URL=http://localhost:5173`
- Restart the API after changing connector env vars

## Connector Matrix

| Integration | What it imports | Required env vars | Local callback URL |
|-------------|-----------------|-------------------|--------------------|
| Google sign-in | User authentication | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `http://localhost:3001/api/auth/google/callback` |
| Google Workspace | Docs, Sheets, Drive files, Slides export support | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | `http://localhost:3001/api/integrations/callback/google` |
| Jira | Projects, epics, tickets | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `JIRA_REDIRECT_URI` | `http://localhost:3001/api/integrations/callback/jira` |
| Slack | Public channel messages and feedback | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI` | `http://localhost:3001/api/integrations/callback/slack` |
| Notion | Pages and databases | `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, `NOTION_REDIRECT_URI` | `http://localhost:3001/api/integrations/callback/notion` |
| Airtable | Bases, tables, records | `AIRTABLE_CLIENT_ID`, `AIRTABLE_CLIENT_SECRET`, `AIRTABLE_REDIRECT_URI` | `http://localhost:3001/api/integrations/callback/airtable` |
| Intercom | Conversations and customer feedback | `INTERCOM_CLIENT_ID`, `INTERCOM_CLIENT_SECRET`, `INTERCOM_REDIRECT_URI` | `http://localhost:3001/api/integrations/callback/intercom` |
| Salesforce | Cases, opportunities, leads, contacts | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_REDIRECT_URI` | `http://localhost:3001/api/integrations/callback/salesforce` |

## Run Without Connectors

You can leave every connector env var blank and still:

- boot the app
- sign in with the email login flow
- add your own model key in Settings
- create sessions without synced external data

## Google Sign-In

Google sign-in is optional for local development.

### Required env vars

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Provider-side setup

1. Create a Google OAuth app in Google Cloud
2. Add this redirect URI:

```text
http://localhost:3001/api/auth/google/callback
```

### Verification

1. Restart the API
2. Open the login page
3. Click the Google sign-in button
4. After auth, you should land back in the app as a signed-in user

## Google Workspace Integration

Google Workspace integration uses the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values as Google sign-in, but it needs a second redirect URI.

### Required env vars

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/callback/google
```

### Provider-side setup

1. In the same Google OAuth app, add this redirect URI too:

```text
http://localhost:3001/api/integrations/callback/google
```

2. Save the OAuth app changes

### Verification

1. Sign in to Product OS
2. Open Settings
3. In the integrations area, connect Google Workspace
4. After auth, the Google integration card should show as connected

## Jira

### What Product OS imports

- Projects and issues for ticket context
- Epics and related work for planning context

### Required env vars

```bash
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
JIRA_REDIRECT_URI=http://localhost:3001/api/integrations/callback/jira
```

### Provider-side setup

1. Create or reuse a Jira Cloud OAuth app
2. Register this redirect URI:

```text
http://localhost:3001/api/integrations/callback/jira
```

### Verification

- Connect Jira from Settings
- Confirm the Jira card shows as connected

## Slack

### What Product OS imports

- Public channel history
- Feedback-oriented conversations

### Required env vars

```bash
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=http://localhost:3001/api/integrations/callback/slack
```

### Provider-side setup

1. Create a Slack app
2. Add the local redirect URI above
3. Install the app to your workspace

### Verification

- Connect Slack from Settings
- Confirm the Slack card shows as connected

## Notion

### What Product OS imports

- Pages
- Databases
- Block content used for docs, OKRs, and notes

### Required env vars

```bash
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=http://localhost:3001/api/integrations/callback/notion
```

### Provider-side setup

1. Create a Notion integration
2. Add the redirect URI above
3. Share the target pages/databases with that integration in Notion

### Verification

- Connect Notion from Settings
- Confirm the Notion card shows as connected

## Airtable

### What Product OS imports

- Bases
- Tables
- Records used for OKRs or feedback

### Required env vars

```bash
AIRTABLE_CLIENT_ID=...
AIRTABLE_CLIENT_SECRET=...
AIRTABLE_REDIRECT_URI=http://localhost:3001/api/integrations/callback/airtable
```

### Provider-side setup

1. Create an Airtable OAuth integration
2. Add the redirect URI above
3. Save the client ID and secret

### Verification

- Connect Airtable from Settings
- Confirm the Airtable card shows as connected

## Intercom

### What Product OS imports

- Conversations
- Customer support context and feedback

### Required env vars

```bash
INTERCOM_CLIENT_ID=...
INTERCOM_CLIENT_SECRET=...
INTERCOM_REDIRECT_URI=http://localhost:3001/api/integrations/callback/intercom
```

### Provider-side setup

1. Create an Intercom app
2. Add the redirect URI above
3. Save the client ID and secret

### Verification

- Connect Intercom from Settings
- Confirm the Intercom card shows as connected

## Salesforce

### What Product OS imports

- Cases
- Opportunities
- Leads
- Contacts

### Required env vars

```bash
SALESFORCE_CLIENT_ID=...
SALESFORCE_CLIENT_SECRET=...
SALESFORCE_REDIRECT_URI=http://localhost:3001/api/integrations/callback/salesforce
```

### Provider-side setup

1. Create a Salesforce connected app
2. Add the redirect URI above
3. Save the client ID and secret

### Verification

- Connect Salesforce from Settings
- Confirm the Salesforce card shows as connected

## Troubleshooting

- Redirect mismatch errors usually mean the provider-side callback URL does not exactly match the local callback URL shown above
- If an integration is missing from the UI, check whether `PUBLIC_DEMO_MODE` is enabled
- If auth succeeds but no data appears, confirm your provider account has access to the source data you expect

See [troubleshooting.md](troubleshooting.md) for more detailed fixes.
