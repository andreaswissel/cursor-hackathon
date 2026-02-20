import { Router, Request, Response } from "express";
import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { discoveryRuns, discoveryClusters, integrations } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { runDiscoveryAnalysis, isRunning } from "../lib/discovery-analyzer";
import { getEnabledIntegrationProvidersForUser } from "../lib/launch-mode";

const router = Router();

router.use(requireAuth);

// GET /api/discovery — get latest completed run + ranked clusters
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const enabledProviders = getEnabledIntegrationProvidersForUser(req.user);

  // Check if user has any integrations (used for isDemoData flag)
  const userIntegrations = enabledProviders.length === 0
    ? []
    : await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          inArray(integrations.provider, enabledProviders)
        )
      );
  const hasIntegrations = userIntegrations.length > 0;

  // Find the latest completed run
  const [latestRun] = await db
    .select()
    .from(discoveryRuns)
    .where(eq(discoveryRuns.userId, userId))
    .orderBy(desc(discoveryRuns.createdAt))
    .limit(1);

  // If no run exists, return an empty state. Analysis results are generated
  // on-demand via POST /run so outputs are always real model output.
  if (!latestRun || latestRun.status === "failed") {
    res.json({
      run: latestRun
        ? {
          id: latestRun.id,
          userId: latestRun.userId,
          status: latestRun.status,
          signalCount: latestRun.signalCount,
          clusterCount: latestRun.clusterCount,
          error: latestRun.error,
          createdAt: latestRun.createdAt.toISOString(),
          completedAt: latestRun.completedAt?.toISOString() ?? null,
        }
        : null,
      clusters: [],
      isMockData: false,
      isDemoData: !hasIntegrations,
    });
    return;
  }

  // Get clusters for the latest completed run
  if (latestRun.status === "completed" && latestRun.clusterCount > 0) {
    const clusters = await db
      .select()
      .from(discoveryClusters)
      .where(eq(discoveryClusters.runId, latestRun.id))
      .orderBy(desc(discoveryClusters.compositeScore));

    res.json({
      run: {
        id: latestRun.id,
        userId: latestRun.userId,
        status: latestRun.status,
        signalCount: latestRun.signalCount,
        clusterCount: latestRun.clusterCount,
        error: latestRun.error,
        createdAt: latestRun.createdAt.toISOString(),
        completedAt: latestRun.completedAt?.toISOString() ?? null,
      },
      clusters: clusters.map(c => ({
        id: c.id,
        runId: c.runId,
        userId: c.userId,
        title: c.title,
        summary: c.summary,
        featureSuggestion: c.featureSuggestion,
        compositeScore: c.compositeScore,
        signalCount: c.signalCount,
        painSeverity: c.painSeverity,
        hasMoneyQuotes: c.hasMoneyQuotes === 1,
        recencyScore: c.recencyScore,
        moneyQuotes: c.moneyQuotes ?? [],
        sampleSignals: c.sampleSignals ?? [],
        sources: c.sources ?? [],
        createdAt: c.createdAt.toISOString(),
      })),
      isMockData: false,
      isDemoData: !hasIntegrations,
    });
    return;
  }

  // Run exists but has no clusters (maybe 0 signals)
  if (latestRun.status === "completed" && latestRun.clusterCount === 0) {
    res.json({
      run: {
        id: latestRun.id,
        userId: latestRun.userId,
        status: latestRun.status,
        signalCount: latestRun.signalCount,
        clusterCount: latestRun.clusterCount,
        error: latestRun.error,
        createdAt: latestRun.createdAt.toISOString(),
        completedAt: latestRun.completedAt?.toISOString() ?? null,
      },
      clusters: [],
      isMockData: false,
      isDemoData: !hasIntegrations,
    });
    return;
  }

  // Run is pending/running.
  res.json({
    run: {
      id: latestRun.id,
      userId: latestRun.userId,
      status: latestRun.status,
      signalCount: latestRun.signalCount,
      clusterCount: latestRun.clusterCount,
      error: latestRun.error,
      createdAt: latestRun.createdAt.toISOString(),
      completedAt: latestRun.completedAt?.toISOString() ?? null,
    },
    clusters: [],
    isMockData: false,
    isDemoData: !hasIntegrations,
  });
});

// POST /api/discovery/run — trigger a new analysis
router.post("/run", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  if (isRunning(userId)) {
    res.status(409).json({ error: "Analysis already in progress" });
    return;
  }

  try {
    const context = req.body?.context ?? undefined;
    const runId = await runDiscoveryAnalysis(userId, context);
    res.json({ runId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/discovery/run/:runId — poll run status
router.get("/run/:runId", async (req: Request, res: Response) => {
  const { runId } = req.params;
  const userId = req.user!.id;

  const [run] = await db
    .select()
    .from(discoveryRuns)
    .where(eq(discoveryRuns.id, runId));

  if (!run || run.userId !== userId) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  res.json({
    id: run.id,
    userId: run.userId,
    status: run.status,
    signalCount: run.signalCount,
    clusterCount: run.clusterCount,
    error: run.error,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  });
});

export default router;
