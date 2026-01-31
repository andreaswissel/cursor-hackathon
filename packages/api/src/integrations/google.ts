import type { IntegrationAdapter, OAuthTokens, IntegrationMetadata, SyncedDataItem } from "./types";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";

export const googleAdapter: IntegrationAdapter = {
  provider: "google",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      state,
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google token exchange failed: ${error}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to refresh Google token");
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Google doesn't always return a new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async getAccountInfo(accessToken: string): Promise<IntegrationMetadata> {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error("Failed to get Google user info");
    }

    const data = await res.json();
    return {
      email: data.email,
      workspaceName: data.email,
    };
  },

  async listSources(accessToken: string): Promise<Array<{ id: string; name: string; type: string }>> {
    // List recent Docs and Sheets from Drive
    const query = encodeURIComponent(
      "(mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet')"
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=100&fields=files(id,name,mimeType)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      console.error("Google Drive list files error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    if (!data.files || !Array.isArray(data.files)) {
      console.error("Google: No files in response", data);
      return [];
    }

    return data.files.map((file: { id: string; name: string; mimeType: string }) => ({
      id: file.id,
      name: file.name,
      type: file.mimeType.includes("document") ? "doc" : "sheet",
    }));
  },

  async syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]> {
    const items: SyncedDataItem[] = [];
    const selectedSources = (metadata.selectedSources as string[]) || [];
    const allSources = await this.listSources(accessToken, metadata);

    // Filter to selected sources, or use defaults if none selected
    const sourcesToSync = selectedSources.length > 0
      ? allSources.filter(s => selectedSources.includes(s.id))
      : allSources;

    console.log(`Google: Syncing ${sourcesToSync.length} of ${allSources.length} sources`);

    // Sync Google Docs
    const docs = sourcesToSync.filter(s => s.type === "doc");
    for (const doc of docs.slice(0, 20)) {
      const res = await fetch(
        `https://docs.googleapis.com/v1/documents/${doc.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const content = extractGoogleDocText(data);

      // Detect type from title/content
      const lowerTitle = doc.name.toLowerCase();
      let dataType: SyncedDataItem["dataType"] = "docs";
      if (lowerTitle.includes("okr") || lowerTitle.includes("objective") || lowerTitle.includes("goal")) {
        dataType = "okrs";
      } else if (lowerTitle.includes("feedback") || lowerTitle.includes("customer") || lowerTitle.includes("research")) {
        dataType = "feedback";
      }

      items.push({
        dataType,
        sourceId: doc.id,
        sourceName: doc.name,
        title: doc.name,
        summary: `${content.length} characters`,
        content: { text: content },
      });
    }

    // Sync Google Sheets
    const sheets = sourcesToSync.filter(s => s.type === "sheet");
    for (const sheet of sheets.slice(0, 10)) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}?includeGridData=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) continue;

      const data = await res.json();

      for (const sheetData of data.sheets?.slice(0, 3) || []) {
        const title = sheetData.properties?.title || "Sheet";
        const rows = extractSheetData(sheetData);

        if (rows.length === 0) continue;

        // Detect type from headers
        const headers = rows[0] || [];
        const headerStr = headers.join(" ").toLowerCase();
        let dataType: SyncedDataItem["dataType"] = "docs";
        if (headerStr.includes("okr") || headerStr.includes("objective") || headerStr.includes("key result")) {
          dataType = "okrs";
        } else if (headerStr.includes("feedback") || headerStr.includes("customer") || headerStr.includes("comment")) {
          dataType = "feedback";
        }

        items.push({
          dataType,
          sourceId: `${sheet.id}/${title}`,
          sourceName: `${sheet.name} / ${title}`,
          title: `${sheet.name} - ${title}`,
          summary: `${rows.length - 1} rows`,
          content: rowsToObjects(rows),
        });
      }
    }

    return items;
  },
};

// Extract plain text from Google Doc
function extractGoogleDocText(doc: { body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content: string } }> } }> } }): string {
  const content: string[] = [];

  for (const element of doc.body?.content || []) {
    if (element.paragraph) {
      for (const textElement of element.paragraph.elements || []) {
        if (textElement.textRun?.content) {
          content.push(textElement.textRun.content);
        }
      }
    }
  }

  return content.join("");
}

// Extract data from Google Sheet
function extractSheetData(sheet: { data?: Array<{ rowData?: Array<{ values?: Array<{ formattedValue?: string }> }> }> }): string[][] {
  const rows: string[][] = [];

  for (const row of sheet.data?.[0]?.rowData || []) {
    const cells = (row.values || []).map(cell => cell.formattedValue || "");
    if (cells.some(c => c)) { // Skip empty rows
      rows.push(cells);
    }
  }

  return rows;
}

// Convert rows to objects using first row as headers
function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header && row[i]) {
        obj[header] = row[i];
      }
    });
    return obj;
  });
}
