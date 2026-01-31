import type { IntegrationAdapter, OAuthTokens, IntegrationMetadata, SyncedDataItem } from "./types";

const AIRTABLE_CLIENT_ID = process.env.AIRTABLE_CLIENT_ID || "";
const AIRTABLE_CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET || "";
const AIRTABLE_REDIRECT_URI = process.env.AIRTABLE_REDIRECT_URI || "";

export const airtableAdapter: IntegrationAdapter = {
  provider: "airtable",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: AIRTABLE_CLIENT_ID,
      redirect_uri: AIRTABLE_REDIRECT_URI,
      response_type: "code",
      state,
      scope: "data.records:read data.recordComments:read schema.bases:read",
    });
    return `https://airtable.com/oauth2/v1/authorize?${params}`;
  },

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch("https://airtable.com/oauth2/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${AIRTABLE_CLIENT_ID}:${AIRTABLE_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: AIRTABLE_REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Airtable token exchange failed: ${error}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch("https://airtable.com/oauth2/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${AIRTABLE_CLIENT_ID}:${AIRTABLE_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to refresh Airtable token");
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async getAccountInfo(accessToken: string): Promise<IntegrationMetadata> {
    const res = await fetch("https://api.airtable.com/v0/meta/whoami", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error("Failed to get Airtable account info");
    }

    const data = await res.json();
    return {
      email: data.email,
      workspaceId: data.id,
    };
  },

  async listSources(accessToken: string): Promise<Array<{ id: string; name: string; type: string }>> {
    const res = await fetch("https://api.airtable.com/v0/meta/bases", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error("Failed to list Airtable bases");
    }

    const data = await res.json();
    return data.bases.map((base: { id: string; name: string }) => ({
      id: base.id,
      name: base.name,
      type: "base",
    }));
  },

  async syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]> {
    const items: SyncedDataItem[] = [];

    // Get all bases
    const bases = await this.listSources(accessToken, metadata);

    for (const base of bases.slice(0, 5)) { // Limit to 5 bases for demo
      // Get tables in base
      const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${base.id}/tables`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!schemaRes.ok) continue;

      const schema = await schemaRes.json();

      for (const table of schema.tables.slice(0, 3)) { // Limit to 3 tables per base
        // Get records from table
        const recordsRes = await fetch(
          `https://api.airtable.com/v0/${base.id}/${encodeURIComponent(table.name)}?maxRecords=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!recordsRes.ok) continue;

        const recordsData = await recordsRes.json();

        // Detect if this looks like OKRs or feedback based on field names
        const fields = table.fields.map((f: { name: string }) => f.name.toLowerCase());
        let dataType: SyncedDataItem["dataType"] = "docs";

        if (fields.some((f: string) => f.includes("objective") || f.includes("okr") || f.includes("key result"))) {
          dataType = "okrs";
        } else if (fields.some((f: string) => f.includes("feedback") || f.includes("customer") || f.includes("comment"))) {
          dataType = "feedback";
        }

        items.push({
          dataType,
          sourceId: `${base.id}/${table.id}`,
          sourceName: `${base.name} / ${table.name}`,
          title: table.name,
          summary: `${recordsData.records.length} records`,
          content: recordsData.records.map((r: { fields: unknown }) => r.fields),
        });
      }
    }

    return items;
  },
};
