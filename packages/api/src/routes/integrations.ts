import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { integrations, integrationData } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { getAdapter, PROVIDER_INFO, type IntegrationProvider } from "../integrations";

const router = Router();

// All integration routes require auth
router.use(requireAuth);

// List all integrations for user
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const userIntegrations = await db
    .select({
      id: integrations.id,
      provider: integrations.provider,
      metadata: integrations.metadata,
      isActive: integrations.isActive,
      lastSyncedAt: integrations.lastSyncedAt,
      createdAt: integrations.createdAt,
    })
    .from(integrations)
    .where(eq(integrations.userId, userId));

  // Add provider info and status
  const result = userIntegrations.map(integration => ({
    ...integration,
    providerInfo: PROVIDER_INFO[integration.provider as IntegrationProvider],
  }));

  // Also return available providers that aren't connected
  const connectedProviders = new Set(userIntegrations.map(i => i.provider));
  const availableProviders = Object.entries(PROVIDER_INFO)
    .filter(([provider]) => !connectedProviders.has(provider))
    .map(([provider, info]) => ({
      provider,
      ...info,
    }));

  res.json({
    connected: result,
    available: availableProviders,
  });
});

// Get OAuth URL for connecting an integration
router.get("/connect/:provider", async (req: Request, res: Response) => {
  const { provider } = req.params;
  const userId = req.user!.id;

  try {
    const adapter = getAdapter(provider as IntegrationProvider);

    // Create state token with user ID
    const state = Buffer.from(JSON.stringify({
      userId,
      provider,
      timestamp: Date.now(),
    })).toString("base64url");

    const authUrl = adapter.getAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// OAuth callback handler
router.get("/callback/:provider", async (req: Request, res: Response) => {
  const { provider } = req.params;
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    res.redirect(`/settings?error=${encodeURIComponent(oauthError as string)}`);
    return;
  }

  if (!code || !state) {
    res.redirect("/settings?error=missing_params");
    return;
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state as string, "base64url").toString());
    const { userId } = stateData;

    const adapter = getAdapter(provider as IntegrationProvider);

    // Exchange code for tokens
    const tokens = await adapter.exchangeCodeForTokens(code as string);

    // Get account info
    const metadata = await adapter.getAccountInfo(tokens.accessToken);

    // Check if integration already exists
    const [existing] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.userId, userId),
        eq(integrations.provider, provider)
      ));

    if (existing) {
      // Update existing integration
      await db
        .update(integrations)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          metadata,
          isActive: 1,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
    } else {
      // Create new integration
      await db.insert(integrations).values({
        id: uuid(),
        userId,
        provider: provider as IntegrationProvider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        metadata,
        isActive: 1,
      });
    }

    res.redirect(`/settings?connected=${provider}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`/settings?error=${encodeURIComponent((error as Error).message)}`);
  }
});

// Disconnect an integration
router.delete("/:integrationId", async (req: Request, res: Response) => {
  const { integrationId } = req.params;
  const userId = req.user!.id;

  // Verify ownership
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(
      eq(integrations.id, integrationId),
      eq(integrations.userId, userId)
    ));

  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }

  // Delete synced data
  await db.delete(integrationData).where(eq(integrationData.integrationId, integrationId));

  // Delete integration
  await db.delete(integrations).where(eq(integrations.id, integrationId));

  res.json({ success: true });
});

// Sync data from an integration
router.post("/:integrationId/sync", async (req: Request, res: Response) => {
  const { integrationId } = req.params;
  const userId = req.user!.id;

  // Get integration
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(
      eq(integrations.id, integrationId),
      eq(integrations.userId, userId)
    ));

  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }

  try {
    const adapter = getAdapter(integration.provider as IntegrationProvider);
    let accessToken = integration.accessToken;

    // Check if token needs refresh
    if (integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) < new Date()) {
      if (integration.refreshToken) {
        const newTokens = await adapter.refreshTokens(integration.refreshToken);
        accessToken = newTokens.accessToken;

        // Update tokens in DB
        await db
          .update(integrations)
          .set({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiresAt: newTokens.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, integrationId));
      } else {
        res.status(401).json({ error: "Token expired, please reconnect" });
        return;
      }
    }

    // Sync data
    const syncedItems = await adapter.syncData(accessToken, integration.metadata || {});

    // Clear old synced data
    await db.delete(integrationData).where(eq(integrationData.integrationId, integrationId));

    // Store new synced data
    for (const item of syncedItems) {
      await db.insert(integrationData).values({
        id: uuid(),
        integrationId,
        dataType: item.dataType,
        sourceId: item.sourceId,
        sourceName: item.sourceName,
        title: item.title,
        summary: item.summary,
        content: item.content,
      });
    }

    // Update last synced timestamp
    await db
      .update(integrations)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(integrations.id, integrationId));

    res.json({
      success: true,
      itemCount: syncedItems.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get synced data for an integration
router.get("/:integrationId/data", async (req: Request, res: Response) => {
  const { integrationId } = req.params;
  const userId = req.user!.id;

  // Verify ownership
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(
      eq(integrations.id, integrationId),
      eq(integrations.userId, userId)
    ));

  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }

  const data = await db
    .select()
    .from(integrationData)
    .where(eq(integrationData.integrationId, integrationId));

  res.json({ data });
});

// Get all synced data for user (for context selection)
router.get("/data/all", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { dataType } = req.query;

  // Get all user's integrations
  const userIntegrations = await db
    .select({ id: integrations.id, provider: integrations.provider })
    .from(integrations)
    .where(eq(integrations.userId, userId));

  if (userIntegrations.length === 0) {
    res.json({ data: [] });
    return;
  }

  // Get all synced data
  let query = db
    .select({
      id: integrationData.id,
      integrationId: integrationData.integrationId,
      dataType: integrationData.dataType,
      sourceId: integrationData.sourceId,
      sourceName: integrationData.sourceName,
      title: integrationData.title,
      summary: integrationData.summary,
      content: integrationData.content,
    })
    .from(integrationData);

  const data = await query;

  // Filter to only user's integrations
  const userIntegrationIds = new Set(userIntegrations.map(i => i.id));
  let filteredData = data.filter(d => userIntegrationIds.has(d.integrationId));

  // Filter by data type if specified
  if (dataType) {
    filteredData = filteredData.filter(d => d.dataType === dataType);
  }

  // Add provider info
  const integrationMap = new Map(userIntegrations.map(i => [i.id, i.provider]));
  const result = filteredData.map(d => ({
    ...d,
    provider: integrationMap.get(d.integrationId),
  }));

  res.json({ data: result });
});

export default router;
