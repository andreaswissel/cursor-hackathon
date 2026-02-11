import type { IntegrationAdapter, OAuthTokens, IntegrationMetadata, SyncedDataItem } from "./types";

const INTERCOM_CLIENT_ID = process.env.INTERCOM_CLIENT_ID || "";
const INTERCOM_CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET || "";
const INTERCOM_REDIRECT_URI = process.env.INTERCOM_REDIRECT_URI || "";

export const intercomAdapter: IntegrationAdapter = {
  provider: "intercom",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: INTERCOM_CLIENT_ID,
      redirect_uri: INTERCOM_REDIRECT_URI,
      state,
    });
    return `https://app.intercom.com/oauth?${params}`;
  },

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch("https://api.intercom.com/auth/eagle/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: INTERCOM_CLIENT_ID,
        client_secret: INTERCOM_CLIENT_SECRET,
        code,
      }),
    });

    if (!res.ok) {
      throw new Error("Intercom token exchange failed");
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error(`Intercom error: no token returned`);
    }

    return {
      accessToken: data.token,
      // Intercom tokens don't expire
    };
  },

  async refreshTokens(): Promise<OAuthTokens> {
    // Intercom tokens don't expire
    throw new Error("Intercom tokens do not require refresh");
  },

  async getAccountInfo(accessToken: string): Promise<IntegrationMetadata> {
    const res = await fetch("https://api.intercom.com/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to get Intercom account info");
    }

    const data = await res.json();

    return {
      workspaceId: data.app?.id_code || data.id,
      workspaceName: data.app?.name || data.name || "Intercom",
      email: data.email,
    };
  },

  async listSources(accessToken: string): Promise<Array<{ id: string; name: string; type: string }>> {
    const sources: Array<{ id: string; name: string; type: string }> = [];

    // List admins (team members whose conversations can be synced)
    try {
      const adminsRes = await fetch("https://api.intercom.com/admins", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        for (const admin of adminsData.admins || []) {
          sources.push({
            id: `admin:${admin.id}`,
            name: admin.name || admin.email || `Admin ${admin.id}`,
            type: "admin",
          });
        }
      }
    } catch (err) {
      console.error("Error listing Intercom admins:", err);
    }

    // List tags for tag-based filtering
    try {
      const tagsRes = await fetch("https://api.intercom.com/tags", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        for (const tag of tagsData.data || []) {
          sources.push({
            id: `tag:${tag.id}`,
            name: tag.name,
            type: "tag",
          });
        }
      }
    } catch (err) {
      console.error("Error listing Intercom tags:", err);
    }

    return sources;
  },

  async syncData(accessToken: string, metadata: IntegrationMetadata): Promise<SyncedDataItem[]> {
    console.log("Intercom sync: Starting sync");

    const items: SyncedDataItem[] = [];
    const selectedSources = (metadata.selectedSources as string[]) || [];

    // Extract selected tag IDs for filtering
    const selectedTagIds = selectedSources
      .filter(s => s.startsWith("tag:"))
      .map(s => s.replace("tag:", ""));

    // Fetch recent conversations (last 30 days)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    let hasMore = true;
    let startingAfter: string | undefined;
    const allConversations: Array<{ id: string; created_at: number; tags?: { tags: Array<{ id: string }> } }> = [];

    while (hasMore) {
      const params = new URLSearchParams({
        per_page: "50",
        sort_field: "updated_at",
        sort_order: "desc",
      });
      if (startingAfter) {
        params.set("starting_after", startingAfter);
      }

      const res = await fetch(`https://api.intercom.com/conversations?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        console.error("Intercom conversations API error:", res.status);
        break;
      }

      const data = await res.json();
      const conversations = data.conversations || [];

      // Stop if we've gone past 30 days
      const recentConversations = conversations.filter(
        (c: { updated_at: number }) => c.updated_at >= thirtyDaysAgo
      );

      allConversations.push(...recentConversations);

      // Stop pagination if we've hit older conversations or no more pages
      if (recentConversations.length < conversations.length || !data.pages?.next) {
        hasMore = false;
      } else {
        startingAfter = data.pages.next?.starting_after;
        if (!startingAfter) hasMore = false;
      }

      // Safety limit: max 200 conversations
      if (allConversations.length >= 200) {
        hasMore = false;
      }
    }

    console.log(`Intercom sync: Found ${allConversations.length} recent conversations`);

    // Filter by tags if selected
    let conversationsToSync = allConversations;
    if (selectedTagIds.length > 0) {
      conversationsToSync = allConversations.filter(c => {
        const convTagIds = (c.tags?.tags || []).map(t => t.id);
        return selectedTagIds.some(tagId => convTagIds.includes(tagId));
      });
      console.log(`Intercom sync: ${conversationsToSync.length} conversations match selected tags`);
    }

    // Fetch conversation details for each conversation
    for (const conversation of conversationsToSync.slice(0, 50)) {
      try {
        const res = await fetch(`https://api.intercom.com/conversations/${conversation.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.error(`Intercom conversation ${conversation.id} error:`, res.status);
          continue;
        }

        const convData = await res.json();
        const parts = convData.conversation_parts?.conversation_parts || [];

        // Build message list from conversation source + parts
        const messages: Array<{ text: string; timestamp: string; author: string; conversationId: string }> = [];

        // Add the initial message
        if (convData.source?.body) {
          const plainText = convData.source.body.replace(/<[^>]*>/g, "").trim();
          if (plainText.length > 5) {
            messages.push({
              text: plainText,
              timestamp: new Date(convData.created_at * 1000).toISOString(),
              author: convData.source.author?.name || convData.source.author?.email || "customer",
              conversationId: conversation.id,
            });
          }
        }

        // Add conversation parts (replies)
        for (const part of parts) {
          if (!part.body) continue;
          const plainText = part.body.replace(/<[^>]*>/g, "").trim();
          if (plainText.length <= 5) continue;

          messages.push({
            text: plainText,
            timestamp: new Date(part.created_at * 1000).toISOString(),
            author: part.author?.name || part.author?.email || part.author?.type || "unknown",
            conversationId: conversation.id,
          });
        }

        // Only include conversations with customer messages
        const hasCustomerMessage = messages.some(m =>
          m.author !== "bot" && m.author !== "operator"
        );

        if (messages.length > 0 && hasCustomerMessage) {
          const title = convData.source?.subject ||
            messages[0].text.substring(0, 80) + (messages[0].text.length > 80 ? "..." : "");

          items.push({
            dataType: "feedback",
            sourceId: conversation.id,
            sourceName: `Conversation #${conversation.id}`,
            title,
            summary: `${messages.length} messages`,
            content: messages,
          });
        }
      } catch (err) {
        console.error(`Error fetching Intercom conversation ${conversation.id}:`, err);
        continue;
      }
    }

    console.log(`Intercom sync: Completed with ${items.length} items`);
    return items;
  },
};
