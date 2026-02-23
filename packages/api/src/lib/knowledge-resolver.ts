import { db } from "../db";
import {
  knowledgeSources,
  sessionKnowledgeOverrides,
  integrationData,
  integrations,
  projects,
  teamMembers,
  users,
} from "../db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import type { KnowledgeFilter, SessionContext } from "@product-os/shared";
import { getEnabledIntegrationProvidersForUser } from "./launch-mode";

export interface ResolvedIntegrationDataRow {
  id: string;
  integrationId: string;
  dataType: string;
  sourceId: string;
  sourceName: string | null;
  content: unknown;
  title: string | null;
  summary: string | null;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Check if a user has access to a project (owns it or is in the project's team).
 */
export async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db
    .select({ userId: projects.userId, teamId: projects.teamId })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) return false;
  if (project.userId === userId) return true;

  if (project.teamId) {
    const [membership] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId)));
    return !!membership;
  }

  return false;
}

/**
 * Get all enabled knowledge sources for a project that are visible to the given user.
 */
async function getProjectKnowledgeSources(projectId: string, userId: string) {
  const sources = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.projectId, projectId),
        eq(knowledgeSources.enabled, 1),
        or(
          eq(knowledgeSources.visibility, "team"),
          and(eq(knowledgeSources.visibility, "private"), eq(knowledgeSources.createdByUserId, userId))
        )
      )
    );

  return sources;
}

/**
 * Get all integration_data rows for a user (via their integrations).
 */
async function getUserIntegrationData(userId: string): Promise<ResolvedIntegrationDataRow[]> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return [];
  }

  const enabledProviders = getEnabledIntegrationProvidersForUser({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin === 1,
    userRole: user.role,
  });

  if (enabledProviders.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: integrationData.id,
      integrationId: integrationData.integrationId,
      dataType: integrationData.dataType,
      sourceId: integrationData.sourceId,
      sourceName: integrationData.sourceName,
      content: integrationData.content,
      title: integrationData.title,
      summary: integrationData.summary,
      provider: integrations.provider,
      createdAt: integrationData.createdAt,
      updatedAt: integrationData.updatedAt,
    })
    .from(integrationData)
    .innerJoin(integrations, eq(integrationData.integrationId, integrations.id))
    .where(
      and(
        eq(integrations.userId, userId),
        inArray(integrations.provider, enabledProviders)
      )
    );

  return rows;
}

/**
 * Apply a KnowledgeFilter to a set of integration data rows.
 */
function applyFilter(rows: ResolvedIntegrationDataRow[], filter: KnowledgeFilter, provider?: string | null, dataTypes?: string[] | null): ResolvedIntegrationDataRow[] {
  let filtered = rows;

  // Filter by provider
  if (provider) {
    filtered = filtered.filter(r => r.provider === provider);
  }

  // Filter by data types
  if (dataTypes && dataTypes.length > 0) {
    filtered = filtered.filter(r => dataTypes.includes(r.dataType));
  }

  // Filter by explicit integrationDataIds
  if (filter.integrationDataIds && filter.integrationDataIds.length > 0) {
    const idSet = new Set(filter.integrationDataIds);
    filtered = filtered.filter(r => idSet.has(r.id));
  }

  // Filter by sourceIds
  if (filter.sourceIds && filter.sourceIds.length > 0) {
    const sourceSet = new Set(filter.sourceIds);
    filtered = filtered.filter(r => sourceSet.has(r.sourceId));
  }

  // Filter by channels (match against sourceName or sourceId)
  if (filter.channels && filter.channels.length > 0) {
    const channelPatterns = filter.channels.map(c => c.toLowerCase());
    filtered = filtered.filter(r => {
      const sourceName = (r.sourceName || "").toLowerCase();
      const sourceId = r.sourceId.toLowerCase();
      return channelPatterns.some(ch => sourceName.includes(ch) || sourceId.includes(ch));
    });
  }

  // Filter by keywords (match in title, summary, or content text)
  if (filter.keywords && filter.keywords.length > 0) {
    const kwPatterns = filter.keywords.map(k => k.toLowerCase());
    filtered = filtered.filter(r => {
      const title = (r.title || "").toLowerCase();
      const summary = (r.summary || "").toLowerCase();
      const contentText = JSON.stringify(r.content).toLowerCase();
      return kwPatterns.some(kw => title.includes(kw) || summary.includes(kw) || contentText.includes(kw));
    });
  }

  return filtered;
}

/**
 * Resolve knowledge: given a project + optional session overrides, return filtered integration_data.
 */
export async function resolveKnowledge(
  projectId: string,
  userId: string,
  sessionId?: string
): Promise<ResolvedIntegrationDataRow[]> {
  // 1. Get project's enabled knowledge sources visible to user
  const sources = await getProjectKnowledgeSources(projectId, userId);

  if (sources.length === 0) {
    return [];
  }

  // 2. Get all user's integration data
  // For team projects, we may need data from all team members
  const [project] = await db
    .select({ userId: projects.userId, teamId: projects.teamId })
    .from(projects)
    .where(eq(projects.id, projectId));

  let allData: ResolvedIntegrationDataRow[];
  if (project?.teamId) {
    // Get all team members' integration data
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, project.teamId));

    const memberIds = members.map(m => m.userId);
    // Get integration data for all team members
    const dataPromises = memberIds.map(mid => getUserIntegrationData(mid));
    const allDataArrays = await Promise.all(dataPromises);
    allData = allDataArrays.flat();
  } else {
    allData = await getUserIntegrationData(userId);
  }

  // 3. For each source, filter the data and collect results
  const resultMap = new Map<string, ResolvedIntegrationDataRow>();
  for (const source of sources) {
    const filters = (source.filters || {}) as KnowledgeFilter;
    const matched = applyFilter(allData, filters, source.provider, source.dataTypes as string[] | null);
    for (const row of matched) {
      resultMap.set(row.id, row);
    }
  }

  let results = Array.from(resultMap.values());

  // 4. Apply session overrides if sessionId provided
  if (sessionId) {
    const overrides = await db
      .select()
      .from(sessionKnowledgeOverrides)
      .where(eq(sessionKnowledgeOverrides.sessionId, sessionId));

    // Process "remove" overrides — remove by knowledge_source_id or integration_data_id
    for (const override of overrides) {
      if (override.action === "remove") {
        if (override.integrationDataId) {
          results = results.filter(r => r.id !== override.integrationDataId);
        }
        if (override.knowledgeSourceId) {
          // Remove all items that were matched by this source
          const source = sources.find(s => s.id === override.knowledgeSourceId);
          if (source) {
            const filters = (source.filters || {}) as KnowledgeFilter;
            const matchedIds = new Set(applyFilter(allData, filters, source.provider, source.dataTypes as string[] | null).map(r => r.id));
            results = results.filter(r => !matchedIds.has(r.id));
          }
        }
      }
    }

    // Process "add" overrides — add specific integration_data items
    for (const override of overrides) {
      if (override.action === "add" && override.integrationDataId) {
        const item = allData.find(r => r.id === override.integrationDataId);
        if (item && !resultMap.has(item.id)) {
          results.push(item);
        }
      }
    }
  }

  return results;
}

/**
 * Count matched items for a single knowledge source (for preview).
 */
export async function countMatchedItems(
  sourceId: string,
  userId: string
): Promise<number> {
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, sourceId));

  if (!source) return 0;

  const allData = await getUserIntegrationData(userId);
  const filters = (source.filters || {}) as KnowledgeFilter;
  const matched = applyFilter(allData, filters, source.provider, source.dataTypes as string[] | null);
  return matched.length;
}

/**
 * Resolve matched items for a single knowledge source.
 */
export async function resolveKnowledgeSource(
  sourceId: string,
  userId: string
): Promise<ResolvedIntegrationDataRow[]> {
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, sourceId));

  if (!source) return [];

  const allData = await getUserIntegrationData(userId);
  const filters = (source.filters || {}) as KnowledgeFilter;
  return applyFilter(allData, filters, source.provider, source.dataTypes as string[] | null);
}

/**
 * Convert resolved integration data into SessionContext format.
 */
export function toSessionContext(
  data: ResolvedIntegrationDataRow[],
  aiSummaries?: Array<{ name: string; summary: string }>
): SessionContext {
  const okrs: Array<{ objective: string; keyResults: string[] }> = [];
  const customerFeedback: string[] = [];
  const internalFeedback: Array<{ channel: string; author: string; message: string }> = [];
  const metrics: Array<{ name: string; value: string; trend: string; delta: string; source: string; description: string }> = [];

  for (const item of data) {
    if (item.dataType === "okrs" && Array.isArray(item.content)) {
      for (const record of item.content as Array<Record<string, unknown>>) {
        const objective = record.Objective || record.objective || record.Name || record.name;
        const keyResults = record["Key Results"] || record.keyResults || record.KRs || [];
        if (objective) {
          okrs.push({
            objective: String(objective),
            keyResults: Array.isArray(keyResults) ? keyResults.map(String) : [String(keyResults)],
          });
        }
      }
    } else if (item.dataType === "feedback" && Array.isArray(item.content)) {
      for (const record of item.content as Array<Record<string, unknown>>) {
        const text = record.Feedback || record.feedback || record.Comment || record.comment || record.Text || record.text;
        if (text) customerFeedback.push(String(text));
      }
    } else if (item.dataType === "tickets" && Array.isArray(item.content)) {
      for (const record of item.content as Array<Record<string, unknown>>) {
        const summary = record.Summary || record.summary || record.Title || record.title;
        if (summary) customerFeedback.push(String(summary));
      }
    } else if (item.dataType === "messages" && Array.isArray(item.content)) {
      for (const record of item.content as Array<Record<string, unknown>>) {
        const message = record.message || record.Message || record.text || record.Text;
        const channel = record.channel || record.Channel || "";
        const author = record.author || record.Author || record.user || "";
        if (message) {
          internalFeedback.push({
            channel: String(channel),
            author: String(author),
            message: String(message),
          });
        }
      }
    }
  }

  const context: SessionContext = {
    okrs,
    customerFeedback,
  };

  if (internalFeedback.length > 0) context.internalFeedback = internalFeedback;
  if (metrics.length > 0) context.metrics = metrics;

  // Include AI summaries as additionalDocs
  if (aiSummaries && aiSummaries.length > 0) {
    context.additionalDocs = aiSummaries
      .map(s => `## ${s.name}\n${s.summary}`)
      .join("\n\n");
  }

  return context;
}
