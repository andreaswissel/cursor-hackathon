import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { knowledgeSources, sessionKnowledgeOverrides, sessions, projects, teamMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { checkProjectAccess, resolveKnowledge, resolveKnowledgeSource, toSessionContext } from "../lib/knowledge-resolver";
import { completion, getUserLLMConfig } from "../lib/llm";
import { users } from "../db/schema";
import type { KnowledgeFilter, KnowledgeVisibility } from "@product-os/shared";

const router = Router();

router.use(requireAuth);

// ========================================================================
// Project-scoped knowledge source CRUD
// ========================================================================

// List knowledge sources for a project
router.get("/projects/:projectId/knowledge", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { projectId } = req.params;

  if (!(await checkProjectAccess(projectId, userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const sources = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.projectId, projectId));

  // Filter visibility: team sources visible to all, private only to creator
  const visible = sources.filter(s =>
    s.visibility === "team" || s.createdByUserId === userId
  );

  res.json({
    sources: visible.map(s => ({
      id: s.id,
      projectId: s.projectId,
      createdByUserId: s.createdByUserId,
      name: s.name,
      description: s.description,
      provider: s.provider,
      dataTypes: s.dataTypes,
      filters: s.filters,
      visibility: s.visibility,
      aiSummary: s.aiSummary,
      aiSummaryGeneratedAt: s.aiSummaryGeneratedAt?.toISOString() ?? null,
      enabled: s.enabled === 1,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
});

// Create a knowledge source
router.post("/projects/:projectId/knowledge", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { projectId } = req.params;
  const { name, description, provider, dataTypes, filters, visibility } = req.body as {
    name: string;
    description?: string;
    provider?: string;
    dataTypes?: string[];
    filters?: KnowledgeFilter;
    visibility?: KnowledgeVisibility;
  };

  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (!(await checkProjectAccess(projectId, userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [created] = await db
    .insert(knowledgeSources)
    .values({
      projectId,
      createdByUserId: userId,
      name,
      description: description || null,
      provider: provider || null,
      dataTypes: dataTypes || null,
      filters: filters || {},
      visibility: visibility || "team",
    })
    .returning();

  res.json({
    id: created.id,
    projectId: created.projectId,
    createdByUserId: created.createdByUserId,
    name: created.name,
    description: created.description,
    provider: created.provider,
    dataTypes: created.dataTypes,
    filters: created.filters,
    visibility: created.visibility,
    aiSummary: created.aiSummary,
    aiSummaryGeneratedAt: created.aiSummaryGeneratedAt?.toISOString() ?? null,
    enabled: created.enabled === 1,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  });
});

// Update a knowledge source
router.patch("/projects/:projectId/knowledge/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { projectId, id } = req.params;
  const { name, description, provider, dataTypes, filters, visibility, enabled } = req.body as {
    name?: string;
    description?: string;
    provider?: string | null;
    dataTypes?: string[] | null;
    filters?: KnowledgeFilter;
    visibility?: KnowledgeVisibility;
    enabled?: boolean;
  };

  if (!(await checkProjectAccess(projectId, userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.projectId, projectId)));

  if (!existing) {
    res.status(404).json({ error: "Knowledge source not found" });
    return;
  }

  // Only creator can edit private sources
  if (existing.visibility === "private" && existing.createdByUserId !== userId) {
    res.status(403).json({ error: "Cannot edit private knowledge source" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (provider !== undefined) updates.provider = provider;
  if (dataTypes !== undefined) updates.dataTypes = dataTypes;
  if (filters !== undefined) updates.filters = filters;
  if (visibility !== undefined) updates.visibility = visibility;
  if (enabled !== undefined) updates.enabled = enabled ? 1 : 0;

  const [updated] = await db
    .update(knowledgeSources)
    .set(updates)
    .where(eq(knowledgeSources.id, id))
    .returning();

  res.json({
    id: updated.id,
    projectId: updated.projectId,
    createdByUserId: updated.createdByUserId,
    name: updated.name,
    description: updated.description,
    provider: updated.provider,
    dataTypes: updated.dataTypes,
    filters: updated.filters,
    visibility: updated.visibility,
    aiSummary: updated.aiSummary,
    aiSummaryGeneratedAt: updated.aiSummaryGeneratedAt?.toISOString() ?? null,
    enabled: updated.enabled === 1,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Delete a knowledge source
router.delete("/projects/:projectId/knowledge/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { projectId, id } = req.params;

  if (!(await checkProjectAccess(projectId, userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.projectId, projectId)));

  if (!existing) {
    res.status(404).json({ error: "Knowledge source not found" });
    return;
  }

  if (existing.visibility === "private" && existing.createdByUserId !== userId) {
    res.status(403).json({ error: "Cannot delete private knowledge source" });
    return;
  }

  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, id));
  res.json({ success: true });
});

// Preview: resolve all knowledge for a project
router.get("/projects/:projectId/knowledge/resolve", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { projectId } = req.params;

  if (!(await checkProjectAccess(projectId, userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const items = await resolveKnowledge(projectId, userId);

  res.json({
    items: items.map(item => ({
      id: item.id,
      integrationId: item.integrationId,
      dataType: item.dataType,
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      title: item.title,
      summary: item.summary,
      provider: item.provider,
    })),
    count: items.length,
  });
});

// Trigger AI summarization for a knowledge source
router.post("/projects/:projectId/knowledge/:id/summarize", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { projectId, id } = req.params;

  if (!(await checkProjectAccess(projectId, userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.projectId, projectId)));

  if (!source) {
    res.status(404).json({ error: "Knowledge source not found" });
    return;
  }

  // Resolve matching items
  const matchedItems = await resolveKnowledgeSource(id, userId);

  if (matchedItems.length === 0) {
    res.status(400).json({ error: "No matching data to summarize" });
    return;
  }

  // Build content for summarization
  const contentParts = matchedItems.map((item, i) => {
    const title = item.title || item.sourceName || `Item ${i + 1}`;
    const contentStr = typeof item.content === "string"
      ? item.content
      : JSON.stringify(item.content, null, 2);
    return `### ${title} (${item.dataType} from ${item.provider})\n${contentStr}`;
  });

  const combinedContent = contentParts.join("\n\n---\n\n");

  // Get user's LLM config
  const [user] = await db
    .select({
      activeProvider: users.activeProvider,
      anthropicApiKey: users.anthropicApiKey,
      openaiApiKey: users.openaiApiKey,
      geminiApiKey: users.geminiApiKey,
    })
    .from(users)
    .where(eq(users.id, userId));

  const llmConfig = getUserLLMConfig(user || {});

  const systemPrompt = `You are a product research analyst. Summarize the following data sources into a concise, actionable summary that a product manager can use as context when developing features. Focus on key themes, pain points, opportunities, and patterns. Be specific and quote relevant data points.`;

  const summary = await completion(
    systemPrompt,
    [{ role: "user", content: `Knowledge source: "${source.name}"\n\nData (${matchedItems.length} items):\n\n${combinedContent}\n\nProvide a concise summary (2-4 paragraphs) of the key insights from this data.` }],
    llmConfig
  );

  // Store the summary
  await db
    .update(knowledgeSources)
    .set({
      aiSummary: summary,
      aiSummaryGeneratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(knowledgeSources.id, id));

  res.json({
    summary,
    generatedAt: new Date().toISOString(),
    itemCount: matchedItems.length,
  });
});

// ========================================================================
// Session knowledge endpoints
// ========================================================================

// Get effective knowledge for a session (resolved + overrides)
router.get("/sessions/:sessionId/knowledge", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId } = req.params;

  // Verify session ownership
  const [session] = await db
    .select({ id: sessions.id, projectId: sessions.projectId, userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (!session.projectId) {
    res.json({ items: [], sources: [], overrides: [], context: { okrs: [], customerFeedback: [] } });
    return;
  }

  // Get project knowledge sources
  const sources = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.projectId, session.projectId));

  // Get overrides
  const overrides = await db
    .select()
    .from(sessionKnowledgeOverrides)
    .where(eq(sessionKnowledgeOverrides.sessionId, sessionId));

  // Resolve
  const items = await resolveKnowledge(session.projectId, userId, sessionId);

  // Build AI summaries list for context
  const aiSummaries = sources
    .filter(s => s.aiSummary && s.enabled === 1)
    .map(s => ({ name: s.name, summary: s.aiSummary! }));

  const context = toSessionContext(items, aiSummaries);

  res.json({
    items: items.map(item => ({
      id: item.id,
      integrationId: item.integrationId,
      dataType: item.dataType,
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      title: item.title,
      summary: item.summary,
      provider: item.provider,
    })),
    sources: sources
      .filter(s => s.visibility === "team" || s.createdByUserId === userId)
      .map(s => ({
        id: s.id,
        name: s.name,
        enabled: s.enabled === 1,
        visibility: s.visibility,
      })),
    overrides: overrides.map(o => ({
      id: o.id,
      sessionId: o.sessionId,
      knowledgeSourceId: o.knowledgeSourceId,
      integrationDataId: o.integrationDataId,
      action: o.action,
      createdAt: o.createdAt.toISOString(),
    })),
    context,
  });
});

// Add session knowledge override
router.post("/sessions/:sessionId/knowledge/overrides", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId } = req.params;
  const { knowledgeSourceId, integrationDataId, action } = req.body as {
    knowledgeSourceId?: string;
    integrationDataId?: string;
    action: "add" | "remove";
  };

  if (!action || !["add", "remove"].includes(action)) {
    res.status(400).json({ error: "Action must be 'add' or 'remove'" });
    return;
  }

  if (!knowledgeSourceId && !integrationDataId) {
    res.status(400).json({ error: "Must provide knowledgeSourceId or integrationDataId" });
    return;
  }

  // Verify session ownership
  const [session] = await db
    .select({ id: sessions.id, userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [created] = await db
    .insert(sessionKnowledgeOverrides)
    .values({
      sessionId,
      knowledgeSourceId: knowledgeSourceId || null,
      integrationDataId: integrationDataId || null,
      action,
    })
    .returning();

  res.json({
    id: created.id,
    sessionId: created.sessionId,
    knowledgeSourceId: created.knowledgeSourceId,
    integrationDataId: created.integrationDataId,
    action: created.action,
    createdAt: created.createdAt.toISOString(),
  });
});

// Remove session knowledge override
router.delete("/sessions/:sessionId/knowledge/overrides/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId, id } = req.params;

  // Verify session ownership
  const [session] = await db
    .select({ id: sessions.id, userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db
    .delete(sessionKnowledgeOverrides)
    .where(and(
      eq(sessionKnowledgeOverrides.id, id),
      eq(sessionKnowledgeOverrides.sessionId, sessionId)
    ));

  res.json({ success: true });
});

export default router;
