import type { IntegrationAdapter, OAuthTokens, IntegrationMetadata, SyncedDataItem } from "./types";

const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID || "";
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET || "";
const SALESFORCE_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || "";

const API_VERSION = "v59.0";

export const salesforceAdapter: IntegrationAdapter = {
  provider: "salesforce",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: SALESFORCE_CLIENT_ID,
      redirect_uri: SALESFORCE_REDIRECT_URI,
      scope: "api refresh_token",
      state,
    });
    return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
  },

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      code,
      redirect_uri: SALESFORCE_REDIRECT_URI,
    });

    const res = await fetch("https://login.salesforce.com/services/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Salesforce token exchange failed: ${error}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      // Salesforce tokens expire in ~2 hours
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    };
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const res = await fetch("https://login.salesforce.com/services/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error("Failed to refresh Salesforce token");
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      // Salesforce reuses the same refresh token
      refreshToken,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    };
  },

  async getAccountInfo(accessToken: string): Promise<IntegrationMetadata> {
    // Use the identity endpoint from the token response
    // First get user info via Chatter API
    const res = await fetch("https://login.salesforce.com/services/oauth2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error("Salesforce getAccountInfo error:", res.status, await res.text());
      throw new Error("Failed to get Salesforce account info");
    }

    const data = await res.json();

    // Extract instance URL from the user's profile URL
    // profile URL looks like: https://myorg.my.salesforce.com/...
    const instanceUrl = data.urls?.custom_domain
      || data.profile?.replace(/\/\d+$/, "")?.replace(/\/[^/]+$/, "")
      || "";

    return {
      workspaceName: data.organization_id ? `Salesforce Org` : "Salesforce",
      email: data.email,
      instanceUrl,
    };
  },

  async listSources(_accessToken: string, _metadata: IntegrationMetadata): Promise<Array<{ id: string; name: string; type: string }>> {
    // Return static list of syncable Salesforce objects
    return [
      { id: "Case", name: "Cases", type: "object" },
      { id: "Opportunity", name: "Opportunities", type: "object" },
      { id: "Lead", name: "Leads", type: "object" },
      { id: "Contact", name: "Contacts", type: "object" },
    ];
  },

  async syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]> {
    const instanceUrl = metadata.instanceUrl as string;
    if (!instanceUrl) {
      console.error("Salesforce sync: No instance URL in metadata");
      return [];
    }

    const items: SyncedDataItem[] = [];
    const selectedSources = (metadata.selectedSources as string[]) || [];

    // Default to Cases and Opportunities if none selected
    const sourcesToSync = selectedSources.length > 0
      ? selectedSources
      : ["Case", "Opportunity"];

    for (const source of sourcesToSync) {
      try {
        let query = "";
        switch (source) {
          case "Case":
            query = "SELECT Id, Subject, Description, Status, CreatedDate FROM Case WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC LIMIT 200";
            break;
          case "Opportunity":
            query = "SELECT Id, Name, Description, StageName, CloseDate, CreatedDate FROM Opportunity WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC LIMIT 200";
            break;
          case "Lead":
            query = "SELECT Id, Name, Company, Status, Description, CreatedDate FROM Lead WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC LIMIT 200";
            break;
          case "Contact":
            query = "SELECT Id, Name, Email, Title, Department, CreatedDate FROM Contact WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC LIMIT 200";
            break;
          default:
            continue;
        }

        const res = await fetch(
          `${instanceUrl}/services/data/${API_VERSION}/query?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
          const errorBody = await res.text();
          console.error(`Salesforce ${source} query error:`, res.status, errorBody);
          continue;
        }

        const data = await res.json();
        const records = data.records || [];

        if (records.length === 0) continue;

        switch (source) {
          case "Case":
            items.push({
              dataType: "feedback",
              sourceId: "salesforce/cases",
              sourceName: "Salesforce Cases",
              title: "Salesforce Cases",
              summary: `${records.length} cases from last 30 days`,
              content: records.map((r: { Id: string; Subject: string; Description: string; Status: string; CreatedDate: string }) => ({
                id: r.Id,
                subject: r.Subject,
                description: r.Description,
                status: r.Status,
                createdDate: r.CreatedDate,
              })),
            });
            break;
          case "Opportunity":
            items.push({
              dataType: "feedback",
              sourceId: "salesforce/opportunities",
              sourceName: "Salesforce Opportunities",
              title: "Salesforce Opportunities",
              summary: `${records.length} opportunities from last 30 days`,
              content: records.map((r: { Id: string; Name: string; Description: string; StageName: string; CloseDate: string; CreatedDate: string }) => ({
                id: r.Id,
                name: r.Name,
                description: r.Description,
                stage: r.StageName,
                closeDate: r.CloseDate,
                createdDate: r.CreatedDate,
              })),
            });
            break;
          case "Lead":
            items.push({
              dataType: "feedback",
              sourceId: "salesforce/leads",
              sourceName: "Salesforce Leads",
              title: "Salesforce Leads",
              summary: `${records.length} leads from last 30 days`,
              content: records.map((r: { Id: string; Name: string; Company: string; Status: string; Description: string; CreatedDate: string }) => ({
                id: r.Id,
                name: r.Name,
                company: r.Company,
                status: r.Status,
                description: r.Description,
                createdDate: r.CreatedDate,
              })),
            });
            break;
          case "Contact":
            items.push({
              dataType: "feedback",
              sourceId: "salesforce/contacts",
              sourceName: "Salesforce Contacts",
              title: "Salesforce Contacts",
              summary: `${records.length} contacts from last 30 days`,
              content: records.map((r: { Id: string; Name: string; Email: string; Title: string; Department: string; CreatedDate: string }) => ({
                id: r.Id,
                name: r.Name,
                email: r.Email,
                title: r.Title,
                department: r.Department,
                createdDate: r.CreatedDate,
              })),
            });
            break;
        }
      } catch (err) {
        console.error(`Salesforce ${source} sync error:`, err);
        continue;
      }
    }

    console.log(`Salesforce: Synced ${items.length} data items`);
    return items;
  },
};
