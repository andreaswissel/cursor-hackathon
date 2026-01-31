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
      console.error("Jira: No workspace ID in metadata");
      return [];
    }

    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${metadata.workspaceId}/rest/api/3/project/search`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      console.error("Jira list projects error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    if (!data.values || !Array.isArray(data.values)) {
      console.error("Jira: No projects in response", data);
      return [];
    }

    return data.values.map((project: { id: string; name: string; key: string }) => ({
      id: project.key,
      name: project.name,
      type: "project",
    }));
  },

  async syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]> {
    if (!metadata.workspaceId) {
      console.error("Jira sync: No workspace ID");
      return [];
    }

    const items: SyncedDataItem[] = [];
    const selectedSources = (metadata.selectedSources as string[]) || [];
    const allProjects = await this.listSources(accessToken, metadata);

    // Filter to selected projects, or use all (up to 5) if none selected
    const projectsToSync = selectedSources.length > 0
      ? allProjects.filter(p => selectedSources.includes(p.id))
      : allProjects.slice(0, 5);

    console.log(`Jira: Syncing ${projectsToSync.length} projects`);

    for (const project of projectsToSync) {
      try {
        // Get issues from project
        const jql = encodeURIComponent(`project = ${project.id} ORDER BY updated DESC`);
        const res = await fetch(
          `https://api.atlassian.com/ex/jira/${metadata.workspaceId}/rest/api/3/search?jql=${jql}&maxResults=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
          console.error(`Jira project ${project.id} error:`, res.status);
          continue;
        }

        const data = await res.json();
        if (!data.issues || !Array.isArray(data.issues)) {
          console.log(`Jira project ${project.id}: No issues found`);
          continue;
        }

        console.log(`Jira project ${project.id}: Found ${data.issues.length} issues`);

        // Group by type
        const epics = data.issues.filter((i: { fields: { issuetype: { name: string } } }) =>
          i.fields.issuetype?.name === "Epic"
        );
        const stories = data.issues.filter((i: { fields: { issuetype: { name: string } } }) =>
          ["Story", "Task", "Bug", "Sub-task"].includes(i.fields.issuetype?.name || "")
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
              status: e.fields.status?.name,
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
              type: s.fields.issuetype?.name,
              status: s.fields.status?.name,
            })),
          });
        }
      } catch (err) {
        console.error(`Jira project ${project.id} sync error:`, err);
        continue;
      }
    }

    console.log(`Jira: Synced ${items.length} data items`);
    return items;
  },
};
