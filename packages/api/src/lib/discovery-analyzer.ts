import { eq, desc, and, lt, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { users, integrations, integrationData, discoveryRuns, discoveryClusters } from "../db/schema";
import { completion, getUserLLMConfig } from "./llm";

// Guard against concurrent runs per user
const runningUsers = new Set<string>();

interface LLMCluster {
  title: string;
  summary: string;
  featureSuggestion: string;
  painSeverity: number;
  moneyQuotes: string[];
  sampleSignals: string[];
  sources: string[];
}

const SYSTEM_PROMPT = `You are a product discovery analyst. You analyze customer signals (feedback, support tickets, Slack messages, etc.) to identify clustered pain points and generate value-framed feature suggestions.

Your job:
1. Identify "money quotes" — signals mentioning competitors, deal losses, churn, or strong frustration language
2. Cluster related signals by underlying pain point (not surface-level keywords)
3. For each cluster, generate a value-framed feature suggestion (start with "Enable users to..." not "Build feature X")
4. Rate pain severity per cluster (1-10)

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "clusters": [
    {
      "title": "Short pain point title",
      "summary": "2-3 sentence summary of the cluster",
      "featureSuggestion": "Enable users to...",
      "painSeverity": 8,
      "moneyQuotes": ["exact quote - attribution"],
      "sampleSignals": ["signal text 1", "signal text 2"],
      "sources": ["Customer Feedback", "Support Tickets"]
    }
  ]
}

Rules:
- Maximum 8 clusters
- painSeverity: 1 (minor annoyance) to 10 (deal-breaker causing churn)
- moneyQuotes: only include actual quotes mentioning competitors, churn, deal loss, or strong frustration. Empty array if none.
- sampleSignals: 2-5 representative signals per cluster
- sources: which data source types contributed to this cluster`;

function flattenSignals(dataRows: Array<{ content: unknown; dataType: string; sourceName: string | null }>): string[] {
  const signals: string[] = [];

  for (const row of dataRows) {
    const content = row.content;
    if (typeof content === "string") {
      signals.push(`[${row.dataType}] ${content.slice(0, 300)}`);
    } else if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "string") {
          signals.push(`[${row.dataType}] ${item.slice(0, 300)}`);
        } else if (typeof item === "object" && item !== null) {
          const text = (item as Record<string, unknown>).message || (item as Record<string, unknown>).text || (item as Record<string, unknown>).summary || JSON.stringify(item);
          signals.push(`[${row.dataType}] ${String(text).slice(0, 300)}`);
        }
      }
    } else if (typeof content === "object" && content !== null) {
      signals.push(`[${row.dataType}] ${JSON.stringify(content).slice(0, 300)}`);
    }
  }

  // Cap at ~200 signals
  return signals.slice(0, 200);
}

function computeCompositeScore(cluster: LLMCluster, totalSignals: number): number {
  // Signal frequency: 30% — how many signals relative to total
  const frequencyRatio = Math.min(cluster.sampleSignals.length / Math.max(totalSignals, 1), 1);
  const frequencyScore = frequencyRatio * 100;

  // Pain severity: 30% — direct from LLM rating
  const painScore = (cluster.painSeverity / 10) * 100;

  // Money quotes: 20% — has deal-loss/churn/competitor signals
  const moneyScore = cluster.moneyQuotes.length > 0 ? 100 : 0;

  // Recency: 20% — for now, assume all signals are recent (we don't have timestamps on individual signals)
  const recencyScore = 75;

  return Math.round(
    frequencyScore * 0.3 +
    painScore * 0.3 +
    moneyScore * 0.2 +
    recencyScore * 0.2
  );
}

export async function runDiscoveryAnalysis(userId: string): Promise<string> {
  if (runningUsers.has(userId)) {
    throw new Error("Analysis already in progress");
  }

  runningUsers.add(userId);
  const runId = uuid();

  try {
    // Create run record
    await db.insert(discoveryRuns).values({
      id: runId,
      userId,
      status: "running",
    });

    // Get user for LLM config
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    // Get all integration data for this user
    const userIntegrations = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.userId, userId));

    if (userIntegrations.length === 0) {
      await db.update(discoveryRuns).set({
        status: "completed",
        signalCount: 0,
        clusterCount: 0,
        completedAt: new Date(),
      }).where(eq(discoveryRuns.id, runId));
      return runId;
    }

    const integrationIds = userIntegrations.map(i => i.id);
    const filteredData = await db
      .select({
        content: integrationData.content,
        dataType: integrationData.dataType,
        sourceName: integrationData.sourceName,
      })
      .from(integrationData)
      .where(inArray(integrationData.integrationId, integrationIds));

    const signals = flattenSignals(filteredData);

    if (signals.length === 0) {
      await db.update(discoveryRuns).set({
        status: "completed",
        signalCount: 0,
        clusterCount: 0,
        completedAt: new Date(),
      }).where(eq(discoveryRuns.id, runId));
      return runId;
    }

    // Call LLM
    const llmConfig = getUserLLMConfig(user);
    const userPrompt = `Analyze these ${signals.length} customer/product signals and cluster them by underlying pain point:\n\n${signals.join("\n")}`;

    const response = await completion(
      SYSTEM_PROMPT,
      [{ role: "user", content: userPrompt }],
      llmConfig
    );

    // Parse LLM response
    let parsed: { clusters: LLMCluster[] };
    try {
      // Try to extract JSON from response (LLM might wrap in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      throw new Error(`Failed to parse LLM response: ${(parseErr as Error).message}`);
    }

    if (!Array.isArray(parsed.clusters)) {
      throw new Error("LLM response missing clusters array");
    }

    // Compute scores and persist clusters
    for (const cluster of parsed.clusters) {
      const compositeScore = computeCompositeScore(cluster, signals.length);
      const recencyScore = 75; // Default since we don't track individual signal dates

      await db.insert(discoveryClusters).values({
        id: uuid(),
        runId,
        userId,
        title: cluster.title,
        summary: cluster.summary,
        featureSuggestion: cluster.featureSuggestion,
        compositeScore,
        signalCount: cluster.sampleSignals.length,
        painSeverity: Math.min(Math.max(cluster.painSeverity, 1), 10),
        hasMoneyQuotes: cluster.moneyQuotes.length > 0 ? 1 : 0,
        recencyScore,
        moneyQuotes: cluster.moneyQuotes,
        sampleSignals: cluster.sampleSignals,
        sources: cluster.sources,
      });
    }

    // Mark run as completed
    await db.update(discoveryRuns).set({
      status: "completed",
      signalCount: signals.length,
      clusterCount: parsed.clusters.length,
      completedAt: new Date(),
    }).where(eq(discoveryRuns.id, runId));

    // Clean up old runs — keep last 5 per user
    const allRuns = await db
      .select({ id: discoveryRuns.id })
      .from(discoveryRuns)
      .where(eq(discoveryRuns.userId, userId))
      .orderBy(desc(discoveryRuns.createdAt));

    if (allRuns.length > 5) {
      const idsToDelete = allRuns.slice(5).map(r => r.id);
      for (const id of idsToDelete) {
        await db.delete(discoveryClusters).where(eq(discoveryClusters.runId, id));
        await db.delete(discoveryRuns).where(eq(discoveryRuns.id, id));
      }
    }

    return runId;
  } catch (error) {
    // Mark run as failed
    await db.update(discoveryRuns).set({
      status: "failed",
      error: (error as Error).message,
      completedAt: new Date(),
    }).where(eq(discoveryRuns.id, runId)).catch(() => {});

    throw error;
  } finally {
    runningUsers.delete(userId);
  }
}

export function isRunning(userId: string): boolean {
  return runningUsers.has(userId);
}

// Clean up stale runs (running for more than 10 minutes)
export async function cleanupStaleRuns(): Promise<void> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  await db.update(discoveryRuns).set({
    status: "failed",
    error: "Timed out",
    completedAt: new Date(),
  }).where(
    and(
      eq(discoveryRuns.status, "running"),
      lt(discoveryRuns.createdAt, tenMinutesAgo)
    )
  );
}
