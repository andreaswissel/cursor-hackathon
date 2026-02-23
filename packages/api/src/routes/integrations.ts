import { Router, Request, Response } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { integrations, integrationData, users } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { getAdapter, PROVIDER_INFO, type IntegrationProvider } from "../integrations";
import { runDiscoveryAnalysis, isRunning as isDiscoveryRunning } from "../lib/discovery-analyzer";
import {
  buildIntegrationLockedError,
  getEnabledIntegrationProvidersForUser,
  getLaunchModeStateForUser,
  isIntegrationProviderEnabledForUser,
} from "../lib/launch-mode";

const router = Router();

// Frontend URL for redirects after OAuth
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const OAUTH_STATE_SECRET =
  process.env.INTEGRATION_STATE_SECRET ||
  process.env.JWT_SECRET ||
  "dev-integration-state-secret-change-in-production";

interface IntegrationOAuthState {
  userId: string;
  provider: IntegrationProvider;
  timestamp: number;
  codeVerifier?: string;
  redirectUri?: string;
}

function signOAuthState(payload: string): string {
  return createHmac("sha256", OAUTH_STATE_SECRET)
    .update(payload)
    .digest("base64url");
}

function encodeOAuthState(state: IntegrationOAuthState): string {
  const payload = JSON.stringify(state);
  const signature = signOAuthState(payload);
  return Buffer.from(JSON.stringify({ payload, signature }), "utf8").toString(
    "base64url"
  );
}

function decodeOAuthState(rawState: string): IntegrationOAuthState {
  const decoded = Buffer.from(rawState, "base64url").toString("utf8");
  const wrapped = JSON.parse(decoded) as { payload?: string; signature?: string };

  if (typeof wrapped.payload !== "string" || typeof wrapped.signature !== "string") {
    throw new Error("Invalid OAuth state");
  }

  const expected = createHmac("sha256", OAUTH_STATE_SECRET)
    .update(wrapped.payload)
    .digest();
  const actual = Buffer.from(wrapped.signature, "base64url");

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid OAuth state signature");
  }

  return JSON.parse(wrapped.payload) as IntegrationOAuthState;
}

function rejectIfIntegrationLocked(
  req: Request,
  res: Response,
  provider: IntegrationProvider
): boolean {
  if (isIntegrationProviderEnabledForUser(provider, req.user)) {
    return false;
  }

  res.status(403).json(buildIntegrationLockedError());
  return true;
}

function getRequestApiBaseUrl(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const hostHeader = req.headers.host;

  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol || "http";
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || hostHeader || "localhost:3001";
  return `${proto}://${host}`;
}

function getIntegrationRedirectUri(req: Request, provider: IntegrationProvider): string | undefined {
  if (provider === "google") {
    return (
      process.env.GOOGLE_REDIRECT_URI ||
      `${getRequestApiBaseUrl(req)}/api/integrations/callback/google`
    );
  }

  return undefined;
}

// OAuth callback handler - MUST be before requireAuth since it's a browser redirect
router.get("/callback/:provider", async (req: Request, res: Response) => {
  const { provider } = req.params;
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    res.redirect(`${FRONTEND_URL}/settings?error=${encodeURIComponent(oauthError as string)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/settings?error=missing_params`);
    return;
  }

  try {
    // Decode state
    const stateData = decodeOAuthState(state as string);
    const { userId, codeVerifier, redirectUri } = stateData;
    const integrationProvider = provider as IntegrationProvider;

    // Re-check policy at callback time to prevent bypassing frontend-only controls.
    const [oauthUser] = await db
      .select({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!oauthUser) {
      res.redirect(`${FRONTEND_URL}/settings?error=user_not_found`);
      return;
    }

    if (
      !isIntegrationProviderEnabledForUser(integrationProvider, {
        id: oauthUser.id,
        email: oauthUser.email,
        isAdmin: oauthUser.isAdmin === 1,
      })
    ) {
      res.redirect(`${FRONTEND_URL}/settings?error=integrations_locked`);
      return;
    }

    const adapter = getAdapter(integrationProvider);

    // Exchange code for tokens (pass codeVerifier for PKCE if present)
    const tokens = await adapter.exchangeCodeForTokens(code as string, codeVerifier, {
      redirectUri,
    });

    // Get account info
    const metadata = await adapter.getAccountInfo(tokens.accessToken);

    // Check if integration already exists
    const [existing] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.userId, userId),
        eq(integrations.provider, integrationProvider)
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
        provider: integrationProvider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        metadata,
        isActive: 1,
      });
    }

    res.redirect(`${FRONTEND_URL}/settings?connected=${provider}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`${FRONTEND_URL}/settings?error=${encodeURIComponent((error as Error).message)}`);
  }
});

// All other integration routes require auth
router.use(requireAuth);

// List all integrations for user
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const enabledProviders = new Set(getEnabledIntegrationProvidersForUser(req.user));
  const launchMode = getLaunchModeStateForUser(req.user);

  const rawIntegrations = await db
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

  const userIntegrations = rawIntegrations.filter((integration) =>
    enabledProviders.has(integration.provider as IntegrationProvider)
  );

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
      isEnabled: enabledProviders.has(provider as IntegrationProvider),
      disabledReason: enabledProviders.has(provider as IntegrationProvider)
        ? null
        : launchMode.message,
    }));

  res.json({
    connected: result,
    available: availableProviders,
    launchMode,
  });
});

// Get OAuth URL for connecting an integration
router.get("/connect/:provider", async (req: Request, res: Response) => {
  const { provider } = req.params;
  const userId = req.user!.id;
  const integrationProvider = provider as IntegrationProvider;

  try {
    if (rejectIfIntegrationLocked(req, res, integrationProvider)) {
      return;
    }

    const adapter = getAdapter(integrationProvider);

    // Create state token with user ID
    const redirectUri = getIntegrationRedirectUri(req, integrationProvider);

    const state = encodeOAuthState({
      userId,
      provider: integrationProvider,
      timestamp: Date.now(),
      redirectUri,
    });

    const authUrl = adapter.getAuthUrl(state, { redirectUri });
    res.json({ authUrl });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
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

// List available sources (bases, projects, etc.) for an integration
router.get("/:integrationId/sources", async (req: Request, res: Response) => {
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

  if (
    rejectIfIntegrationLocked(
      req,
      res,
      integration.provider as IntegrationProvider
    )
  ) {
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

    const sources = await adapter.listSources(accessToken, integration.metadata || {});
    const selectedSources = (integration.metadata as Record<string, unknown>)?.selectedSources as string[] || [];

    res.json({
      sources,
      selectedSources,
    });
  } catch (error) {
    console.error("List sources error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update selected sources for an integration
router.put("/:integrationId/sources", async (req: Request, res: Response) => {
  const { integrationId } = req.params;
  const { selectedSources } = req.body;
  const userId = req.user!.id;

  if (!Array.isArray(selectedSources)) {
    res.status(400).json({ error: "selectedSources must be an array" });
    return;
  }

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

  if (
    rejectIfIntegrationLocked(
      req,
      res,
      integration.provider as IntegrationProvider
    )
  ) {
    return;
  }

  // Update metadata with selected sources
  const updatedMetadata = {
    ...(integration.metadata || {}),
    selectedSources,
  };

  await db
    .update(integrations)
    .set({
      metadata: updatedMetadata,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  res.json({ success: true, selectedSources });
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

  if (
    rejectIfIntegrationLocked(
      req,
      res,
      integration.provider as IntegrationProvider
    )
  ) {
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

    // Auto-trigger discovery analysis after successful sync
    if (!isDiscoveryRunning(userId)) {
      runDiscoveryAnalysis(userId).catch(err =>
        console.error("Auto-discovery after sync failed:", err)
      );
    }

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

  if (
    rejectIfIntegrationLocked(
      req,
      res,
      integration.provider as IntegrationProvider
    )
  ) {
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
  const enabledProviders = getEnabledIntegrationProvidersForUser(req.user);

  if (enabledProviders.length === 0) {
    res.json({ data: [], liveDataEnabled: false, waitlistUrl: "/waitlist" });
    return;
  }

  // Get all user's integrations
  const userIntegrations = await db
    .select({ id: integrations.id, provider: integrations.provider })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        inArray(integrations.provider, enabledProviders)
      )
    );

  if (userIntegrations.length === 0) {
    res.json({ data: [], liveDataEnabled: true, waitlistUrl: "/waitlist" });
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

  res.json({ data: result, liveDataEnabled: true, waitlistUrl: "/waitlist" });
});

export default router;
