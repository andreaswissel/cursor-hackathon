import type { IntegrationAdapter, OAuthTokens, IntegrationMetadata, SyncedDataItem } from "./types";

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID || "";
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET || "";
const JIRA_REDIRECT_URI = process.env.JIRA_REDIRECT_URI || "";

export const jiraAdapter: IntegrationAdapter = {
  provider: "jira",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: JIRA_CLIENT_ID,
      scope: "read:jira-work read:jira-user offline_access",
      redirect_uri: JIRA_REDIRECT_URI,
      state,
      response_type: "code",
      prompt: "consent",
    });
    return `https://auth.atlassian.com/authorize?${params}`;
  },

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        code,
        redirect_uri: JIRA_REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Jira token exchange failed: ${error}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to refresh Jira token");
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async getAccountInfo(accessToken: string): Promise<IntegrationMetadata> {
    // Get accessible resources (sites)
    const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error("Failed to get Jira sites");
    }

    const sites = await res.json();
    const site = sites[0]; // Use first site

    return {
      workspaceId: site?.id,
      workspaceName: site?.name,
    };
  },

  async listSources(accessToken: string, metadata: IntegrationMetadata): Promise<Array<{ id: string; name: string; type: string }>> {
    if (!metadata.workspaceId) {
      throw new Error("No Jira workspace found");
    }

    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${metadata.workspaceId}/rest/api/3/project/search`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      throw new Error("Failed to list Jira projects");
    }

    const data = await res.json();
    return data.values.map((project: { id: string; name: string; key: string }) => ({
      id: project.key,
      name: project.name,
      type: "project",
    }));
  },

  async syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]> {
    if (!metadata.workspaceId) {
      throw new Error("No Jira workspace found");
    }

    const items: SyncedDataItem[] = [];
    const projects = await this.listSources(accessToken, metadata);

    for (const project of projects.slice(0, 5)) { // Limit to 5 projects
      // Get issues from project
      const jql = encodeURIComponent(`project = ${project.id} ORDER BY updated DESC`);
      const res = await fetch(
        `https://api.atlassian.com/ex/jira/${metadata.workspaceId}/rest/api/3/search?jql=${jql}&maxResults=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) continue;

      const data = await res.json();

      // Group by type
      const epics = data.issues.filter((i: { fields: { issuetype: { name: string } } }) =>
        i.fields.issuetype.name === "Epic"
      );
      const stories = data.issues.filter((i: { fields: { issuetype: { name: string } } }) =>
        ["Story", "Task", "Bug"].includes(i.fields.issuetype.name)
      );

      if (epics.length > 0) {
        items.push({
          dataType: "okrs",
          sourceId: `${project.id}/epics`,
          sourceName: `${project.name} / Epics`,
          title: `${project.name} Epics`,
          summary: `${epics.length} epics`,
          content: epics.map((e: { key: string; fields: { summary: string; description: unknown; status: { name: string } } }) => ({
            key: e.key,
            summary: e.fields.summary,
            description: e.fields.description,
            status: e.fields.status.name,
          })),
        });
      }

      if (stories.length > 0) {
        items.push({
          dataType: "tickets",
          sourceId: `${project.id}/issues`,
          sourceName: `${project.name} / Issues`,
          title: `${project.name} Issues`,
          summary: `${stories.length} issues`,
          content: stories.map((s: { key: string; fields: { summary: string; description: unknown; issuetype: { name: string }; status: { name: string } } }) => ({
            key: s.key,
            summary: s.fields.summary,
            description: s.fields.description,
            type: s.fields.issuetype.name,
            status: s.fields.status.name,
          })),
        });
      }
    }

    return items;
  },
};
