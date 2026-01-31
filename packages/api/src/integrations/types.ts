import type { IntegrationProvider } from "../db/schema";

export type { IntegrationProvider };

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface IntegrationMetadata {
  workspaceId?: string;
  workspaceName?: string;
  teamId?: string;
  email?: string;
  [key: string]: unknown;
}

export interface SyncedDataItem {
  dataType: "okrs" | "feedback" | "tickets" | "docs" | "messages";
  sourceId: string;
  sourceName?: string;
  title?: string;
  summary?: string;
  content: unknown;
}

export interface IntegrationAdapter {
  provider: IntegrationProvider;

  // OAuth flow
  getAuthUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;

  // Get workspace/account info after auth
  getAccountInfo(accessToken: string): Promise<IntegrationMetadata>;

  // Sync data from the integration
  syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]>;

  // List available data sources (bases, projects, pages, channels)
  listSources(accessToken: string, metadata: IntegrationMetadata): Promise<Array<{
    id: string;
    name: string;
    type: string;
  }>>;
}

// Provider display info
export const PROVIDER_INFO: Record<IntegrationProvider, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  airtable: {
    name: "Airtable",
    description: "Sync OKRs and feedback from Airtable bases",
    icon: "table",
    color: "#18BFFF",
  },
  jira: {
    name: "Jira",
    description: "Import tickets and epics from Jira projects",
    icon: "ticket",
    color: "#0052CC",
  },
  notion: {
    name: "Notion",
    description: "Pull docs and databases from Notion",
    icon: "file-text",
    color: "#000000",
  },
  google: {
    name: "Google Workspace",
    description: "Connect Google Docs and Sheets",
    icon: "file",
    color: "#4285F4",
  },
  slack: {
    name: "Slack",
    description: "Import customer feedback from Slack channels",
    icon: "message-square",
    color: "#4A154B",
  },
};
