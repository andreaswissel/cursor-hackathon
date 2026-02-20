import { eq, desc, and, lt, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { users, integrations, integrationData, discoveryRuns, discoveryClusters } from "../db/schema";
import { completion, getUserLLMConfig } from "./llm";
import { getEnabledIntegrationProvidersForUser } from "./launch-mode";
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

interface DiscoveryContext {
  okrs: Array<{ objective: string; keyResults: string[] }>;
  customerFeedback: string[];
  internalFeedback?: Array<{ channel: string; author: string; message: string }>;
  metrics?: Array<{ name: string; value: string; trend: string; delta: string; source: string; description: string }>;
}

function buildContextSignals(context: DiscoveryContext): string[] {
  const signals: string[] = [];

  for (const okr of context.okrs) {
    signals.push(`[okrs] Objective: ${okr.objective} | Key Results: ${okr.keyResults.join(", ")}`);
  }

  for (const feedback of context.customerFeedback) {
    signals.push(`[feedback] "${feedback}"`);
  }

  if (context.internalFeedback) {
    for (const item of context.internalFeedback) {
      signals.push(`[internal] ${item.channel} - ${item.author}: "${item.message}"`);
    }
  }

  if (context.metrics) {
    for (const metric of context.metrics) {
      signals.push(`[metrics] ${metric.name}: ${metric.value} (${metric.trend} ${metric.delta}) - ${metric.description}`);
    }
  }

  return signals;
}

function getDemoContext(): DiscoveryContext {
  return {
    okrs: [
      { objective: "Increase user engagement", keyResults: ["Increase daily active usage by 20%", "Reduce time-to-insight by 40%"] },
      { objective: "Reduce support burden", keyResults: ["Decrease support tickets by 30%", "Self-service resolution rate → 60%"] },
    ],
    customerFeedback: [
      "I can never find the report I need. Search is completely broken. - Enterprise PM",
      "Would love to just ASK questions about my data instead of clicking around. - Startup founder",
      "Spent 20 minutes looking for last quarter's revenue breakdown. Gave up. - Sales lead",
      "Too many clicks to get anywhere. Navigation is a maze. - Power user, 2yr customer",
      "Your competitors have AI features now. When are you catching up? - Churned customer exit interview",
      "The dashboard is powerful but I only use 10% because I can't find the rest. - Mid-market ops manager",
    ],
    internalFeedback: [
      { channel: "#product", author: "Sarah (PM)", message: "Sales team keeps asking for better search. Lost 2 deals this quarter because prospects couldn't find features during demos." },
      { channel: "#engineering", author: "Mike (Tech Lead)", message: "We've had 3 escalations this week about search performance. Current implementation won't scale." },
      { channel: "#customer-success", author: "Lisa (CS Manager)", message: "NPS comments are brutal this month. 'Can't find anything' is the top complaint." },
      { channel: "#leadership", author: "CEO", message: "Board is asking about our AI strategy. Competitors are shipping AI features monthly. We need to move faster." },
      { channel: "#support", author: "Jake (Support Lead)", message: "40% of tickets this week are 'how do I find X'. We need better discoverability ASAP." },
    ],
    metrics: [
      { name: "Search Usage", value: "12%", trend: "down", delta: "-3% MoM", source: "Mixpanel", description: "Users who use search at least once per session" },
      { name: "Search Success Rate", value: "34%", trend: "down", delta: "-8% MoM", source: "Mixpanel", description: "Searches that result in a click within 30s" },
      { name: "Avg. Time to Find Report", value: "4.2 min", trend: "up", delta: "+45s MoM", source: "Segment", description: "Time from login to opening first report" },
      { name: "Feature Discovery Rate", value: "23%", trend: "flat", delta: "0% MoM", source: "Amplitude", description: "% of features used by average user" },
      { name: "Support Tickets (Search)", value: "847", trend: "up", delta: "+22% MoM", source: "Zendesk", description: "Tickets mentioning search or navigation" },
      { name: "User Retention (30d)", value: "61%", trend: "down", delta: "-4% MoM", source: "Mixpanel", description: "Users returning within 30 days" },
    ],
  };
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

export async function runDiscoveryAnalysis(userId: string, context?: DiscoveryContext): Promise<string> {
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
    const enabledProviders = getEnabledIntegrationProvidersForUser({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin === 1,
    });

    let signals: string[];

    if (context) {
      // Context provided from frontend — use it directly
      signals = buildContextSignals(context);
    } else {
      // No context (backward compat, e.g. auto-triggered after integration sync)
      // Try to read from integrationData DB table
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

      let dbSignals: string[] = [];
      if (userIntegrations.length > 0) {
        const integrationIds = userIntegrations.map(i => i.id);
        const filteredData = await db
          .select({
            content: integrationData.content,
            dataType: integrationData.dataType,
            sourceName: integrationData.sourceName,
          })
          .from(integrationData)
          .where(inArray(integrationData.integrationId, integrationIds));

        dbSignals = flattenSignals(filteredData);
      }

      // Fall back to demo data if no DB signals
      signals = dbSignals.length > 0 ? dbSignals : buildContextSignals(getDemoContext());
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
