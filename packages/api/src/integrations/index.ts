import type { IntegrationAdapter, IntegrationProvider } from "./types";
import { airtableAdapter } from "./airtable";
import { jiraAdapter } from "./jira";
import { notionAdapter } from "./notion";
import { googleAdapter } from "./google";
import { slackAdapter } from "./slack";
import { intercomAdapter } from "./intercom";
import { salesforceAdapter } from "./salesforce";

export * from "./types";

// Registry of all integration adapters
export const integrationAdapters: Record<IntegrationProvider, IntegrationAdapter> = {
  airtable: airtableAdapter,
  jira: jiraAdapter,
  notion: notionAdapter,
  google: googleAdapter,
  slack: slackAdapter,
  intercom: intercomAdapter,
  salesforce: salesforceAdapter,
};

// Get adapter by provider
export function getAdapter(provider: IntegrationProvider): IntegrationAdapter {
  const adapter = integrationAdapters[provider];
  if (!adapter) {
    throw new Error(`Unknown integration provider: ${provider}`);
  }
  return adapter;
}

// List all available providers
export function listProviders(): IntegrationProvider[] {
  return Object.keys(integrationAdapters) as IntegrationProvider[];
}
