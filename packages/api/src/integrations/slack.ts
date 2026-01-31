import type { IntegrationAdapter, OAuthTokens, IntegrationMetadata, SyncedDataItem } from "./types";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || "";
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || "";
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || "";

export const slackAdapter: IntegrationAdapter = {
  provider: "slack",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      redirect_uri: SLACK_REDIRECT_URI,
      state,
      scope: "channels:history,channels:read,users:read",
      user_scope: "channels:history,channels:read",
    });
    return `https://slack.com/oauth/v2/authorize?${params}`;
  },

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      throw new Error("Slack token exchange failed");
    }

    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Slack error: ${data.error}`);
    }

    return {
      accessToken: data.access_token,
      // Slack tokens don't expire by default
    };
  },

  async refreshTokens(): Promise<OAuthTokens> {
    // Slack tokens don't expire with standard OAuth
    throw new Error("Slack tokens do not require refresh");
  },

  async getAccountInfo(accessToken: string): Promise<IntegrationMetadata> {
    const res = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error("Failed to get Slack auth info");
    }

    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Slack error: ${data.error}`);
    }

    return {
      workspaceId: data.team_id,
      workspaceName: data.team,
      email: data.user,
    };
  },

  async listSources(accessToken: string): Promise<Array<{ id: string; name: string; type: string }>> {
    // Only list public channels - private channels need additional scopes
    const res = await fetch("https://slack.com/api/conversations.list?types=public_channel&limit=200", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error("Slack API HTTP error:", res.status);
      throw new Error("Failed to list Slack channels");
    }

    const data = await res.json();
    if (!data.ok) {
      console.error("Slack API error:", data.error);
      // Return empty array instead of throwing for missing_scope errors
      if (data.error === "missing_scope" || data.error === "not_in_channel") {
        return [];
      }
      throw new Error(`Slack error: ${data.error}`);
    }

    return (data.channels || []).map((channel: { id: string; name: string; is_private: boolean }) => ({
      id: channel.id,
      name: `#${channel.name}`,
      type: channel.is_private ? "private_channel" : "public_channel",
    }));
  },

  async syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]> {
    const items: SyncedDataItem[] = [];
    const selectedSources = (metadata.selectedSources as string[]) || [];
    const allChannels = await this.listSources(accessToken, metadata);

    let channelsToSync: Array<{ id: string; name: string; type: string }>;

    if (selectedSources.length > 0) {
      // Use selected channels
      channelsToSync = allChannels.filter(c => selectedSources.includes(c.id));
    } else {
      // Default: filter for channels that likely contain feedback
      const feedbackChannels = allChannels.filter(c => {
        const name = c.name.toLowerCase();
        return name.includes("feedback") ||
               name.includes("customer") ||
               name.includes("support") ||
               name.includes("product") ||
               name.includes("request") ||
               name.includes("bug");
      });

      // If no specific channels, take first 5 public channels
      channelsToSync = feedbackChannels.length > 0 ? feedbackChannels.slice(0, 5) : allChannels.slice(0, 5);
    }

    for (const channel of channelsToSync) {
      try {
        // Get recent messages (last 7 days)
        const oldest = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
        const res = await fetch(
          `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${oldest}&limit=200`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
          console.error(`Slack channel ${channel.name} HTTP error:`, res.status);
          continue;
        }

        const data = await res.json();
        if (!data.ok) {
          console.error(`Slack channel ${channel.name} API error:`, data.error);
          continue;
        }

        if (!data.messages?.length) continue;

        // Filter out bot messages and extract meaningful content
        const messages = data.messages
          .filter((m: { bot_id?: string; subtype?: string; text: string }) =>
            !m.bot_id && !m.subtype && m.text && m.text.length > 10
          )
          .map((m: { text: string; ts: string; user: string }) => ({
            text: m.text,
            timestamp: new Date(parseFloat(m.ts) * 1000).toISOString(),
            user: m.user,
          }));

        if (messages.length === 0) continue;

        items.push({
          dataType: "feedback",
          sourceId: channel.id,
          sourceName: channel.name,
          title: `${channel.name} messages`,
          summary: `${messages.length} messages from last 7 days`,
          content: messages,
        });
      } catch (err) {
        console.error(`Error syncing Slack channel ${channel.name}:`, err);
        continue;
      }
    }

    return items;
  },
};
