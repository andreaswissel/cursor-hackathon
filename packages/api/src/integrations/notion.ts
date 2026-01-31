import type { IntegrationAdapter, OAuthTokens, IntegrationMetadata, SyncedDataItem } from "./types";

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || "";
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || "";
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || "";

export const notionAdapter: IntegrationAdapter = {
  provider: "notion",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: NOTION_CLIENT_ID,
      redirect_uri: NOTION_REDIRECT_URI,
      response_type: "code",
      state,
      owner: "user",
    });
    return `https://api.notion.com/v1/oauth/authorize?${params}`;
  },

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: NOTION_REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Notion token exchange failed: ${error}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      // Notion tokens don't expire
    };
  },

  async refreshTokens(): Promise<OAuthTokens> {
    // Notion tokens don't expire, no refresh needed
    throw new Error("Notion tokens do not require refresh");
  },

  async getAccountInfo(accessToken: string): Promise<IntegrationMetadata> {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to get Notion user info");
    }

    const data = await res.json();
    return {
      workspaceId: data.bot?.workspace_name,
      workspaceName: data.bot?.workspace_name,
      email: data.bot?.owner?.user?.person?.email,
    };
  },

  async listSources(accessToken: string): Promise<Array<{ id: string; name: string; type: string }>> {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "object", value: "database" },
        page_size: 50,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to search Notion");
    }

    const data = await res.json();
    const databases = data.results.map((db: { id: string; title: Array<{ plain_text: string }> }) => ({
      id: db.id,
      name: db.title?.[0]?.plain_text || "Untitled",
      type: "database",
    }));

    // Also get pages
    const pagesRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "object", value: "page" },
        page_size: 50,
      }),
    });

    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      const pages = pagesData.results.map((page: { id: string; properties?: { title?: { title: Array<{ plain_text: string }> } } }) => ({
        id: page.id,
        name: page.properties?.title?.title?.[0]?.plain_text || "Untitled",
        type: "page",
      }));
      return [...databases, ...pages];
    }

    return databases;
  },

  async syncData(accessToken: string): Promise<SyncedDataItem[]> {
    const items: SyncedDataItem[] = [];
    const sources = await this.listSources(accessToken, {});

    // Sync databases
    const databases = sources.filter(s => s.type === "database");
    for (const db of databases.slice(0, 5)) {
      const res = await fetch(`https://api.notion.com/v1/databases/${db.id}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 100 }),
      });

      if (!res.ok) continue;

      const data = await res.json();

      // Try to detect data type from property names
      const firstItem = data.results[0];
      const propertyNames = firstItem ? Object.keys(firstItem.properties).map(p => p.toLowerCase()) : [];

      let dataType: SyncedDataItem["dataType"] = "docs";
      if (propertyNames.some(p => p.includes("objective") || p.includes("okr") || p.includes("goal"))) {
        dataType = "okrs";
      } else if (propertyNames.some(p => p.includes("feedback") || p.includes("customer") || p.includes("request"))) {
        dataType = "feedback";
      }

      items.push({
        dataType,
        sourceId: db.id,
        sourceName: db.name,
        title: db.name,
        summary: `${data.results.length} items`,
        content: data.results.map((item: { properties: Record<string, unknown> }) => {
          // Extract text values from properties
          const extracted: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(item.properties)) {
            extracted[key] = extractNotionValue(value);
          }
          return extracted;
        }),
      });
    }

    // Sync pages (get content)
    const pages = sources.filter(s => s.type === "page");
    for (const page of pages.slice(0, 10)) {
      const res = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const content = data.results.map((block: { type: string; [key: string]: unknown }) => {
        const blockType = block.type;
        const blockData = block[blockType] as { rich_text?: Array<{ plain_text: string }> } | undefined;
        return blockData?.rich_text?.map((t) => t.plain_text).join("") || "";
      }).filter(Boolean).join("\n");

      if (content) {
        items.push({
          dataType: "docs",
          sourceId: page.id,
          sourceName: page.name,
          title: page.name,
          summary: `${content.length} characters`,
          content: { text: content },
        });
      }
    }

    return items;
  },
};

// Helper to extract plain text from Notion property values
function extractNotionValue(value: unknown): unknown {
  const v = value as { type: string; [key: string]: unknown };
  switch (v.type) {
    case "title":
    case "rich_text":
      return (v[v.type] as Array<{ plain_text: string }>)?.map(t => t.plain_text).join("") || "";
    case "number":
      return v.number;
    case "select":
      return (v.select as { name: string } | null)?.name;
    case "multi_select":
      return (v.multi_select as Array<{ name: string }>)?.map(s => s.name);
    case "date":
      return (v.date as { start: string } | null)?.start;
    case "checkbox":
      return v.checkbox;
    case "url":
      return v.url;
    case "email":
      return v.email;
    default:
      return null;
  }
}
