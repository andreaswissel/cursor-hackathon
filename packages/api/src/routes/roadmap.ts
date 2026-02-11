import { Router, Request, Response } from "express";
import { eq, and, or, isNull, desc, ilike } from "drizzle-orm";
import { db } from "../db";
import { roadmapItems, roadmapItemSessions, sessions, teamMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// List roadmap items (personal + active team)
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const activeTeamId = req.user!.activeTeamId;

  let items;
  if (activeTeamId) {
    items = await db
      .select()
      .from(roadmapItems)
      .where(
        or(
          and(eq(roadmapItems.userId, userId), isNull(roadmapItems.teamId)),
          eq(roadmapItems.teamId, activeTeamId)
        )
      )
      .orderBy(roadmapItems.order, desc(roadmapItems.updatedAt));
  } else {
    items = await db
      .select()
      .from(roadmapItems)
      .where(and(eq(roadmapItems.userId, userId), isNull(roadmapItems.teamId)))
      .orderBy(roadmapItems.order, desc(roadmapItems.updatedAt));
  }

  // Fetch linked sessions for all items
  const itemIds = items.map((i) => i.id);
  let allLinks: Array<{ roadmapItemId: string; sessionId: string }> = [];
  if (itemIds.length > 0) {
    allLinks = await db
      .select({ roadmapItemId: roadmapItemSessions.roadmapItemId, sessionId: roadmapItemSessions.sessionId })
      .from(roadmapItemSessions);
    allLinks = allLinks.filter((l) => itemIds.includes(l.roadmapItemId));
  }

  // Fetch session details for linked sessions
  const sessionIds = [...new Set(allLinks.map((l) => l.sessionId))];
  let sessionMap = new Map<string, { id: string; idea: string; status: string; mode: string | null }>();
  if (sessionIds.length > 0) {
    const dbSessions = await db
      .select({ id: sessions.id, idea: sessions.idea, status: sessions.status, mode: sessions.mode })
      .from(sessions);
    for (const s of dbSessions) {
      if (sessionIds.includes(s.id)) {
        sessionMap.set(s.id, s);
      }
    }
  }

  // Build link map
  const linksByItem = new Map<string, string[]>();
  for (const l of allLinks) {
    if (!linksByItem.has(l.roadmapItemId)) linksByItem.set(l.roadmapItemId, []);
    linksByItem.get(l.roadmapItemId)!.push(l.sessionId);
  }

  const result = items.map((item) => {
    const linkedIds = linksByItem.get(item.id) ?? [];
    return {
      id: item.id,
      userId: item.userId,
      teamId: item.teamId,
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      targetQuarter: item.targetQuarter,
      startDate: item.startDate,
      endDate: item.endDate,
      order: item.order,
      linkedSessionIds: linkedIds,
      linkedSessions: linkedIds
        .map((sid) => sessionMap.get(sid))
        .filter(Boolean)
        .map((s) => ({ id: s!.id, idea: s!.idea, status: s!.status, mode: s!.mode ?? undefined })),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  });

  res.json({ items: result });
});

// Create roadmap item
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const activeTeamId = req.user!.activeTeamId;
  const { title, description, status, priority, targetQuarter, startDate, endDate, order, linkedSessionIds } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const [created] = await db
    .insert(roadmapItems)
    .values({
      userId,
      teamId: activeTeamId || null,
      title: title.trim(),
      description: description || null,
      status: status || "backlog",
      priority: priority || "medium",
      targetQuarter: targetQuarter || null,
      startDate: startDate || null,
      endDate: endDate || null,
      order: order ?? 0,
    })
    .returning();

  // Insert session links
  if (linkedSessionIds && Array.isArray(linkedSessionIds) && linkedSessionIds.length > 0) {
    await db.insert(roadmapItemSessions).values(
      linkedSessionIds.map((sessionId: string) => ({
        roadmapItemId: created.id,
        sessionId,
      }))
    );
  }

  res.json({
    id: created.id,
    userId: created.userId,
    teamId: created.teamId,
    title: created.title,
    description: created.description,
    status: created.status,
    priority: created.priority,
    targetQuarter: created.targetQuarter,
    startDate: created.startDate,
    endDate: created.endDate,
    order: created.order,
    linkedSessionIds: linkedSessionIds || [],
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  });
});

// Get single roadmap item
router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const activeTeamId = req.user!.activeTeamId;
  const itemId = req.params.id;

  const [item] = await db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.id, itemId));

  if (!item) {
    res.status(404).json({ error: "Roadmap item not found" });
    return;
  }

  // Access check
  if (item.teamId) {
    if (item.teamId !== activeTeamId) {
      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, item.teamId), eq(teamMembers.userId, userId)));
      if (!membership) {
        res.status(404).json({ error: "Roadmap item not found" });
        return;
      }
    }
  } else if (item.userId !== userId) {
    res.status(404).json({ error: "Roadmap item not found" });
    return;
  }

  // Get linked sessions
  const links = await db
    .select({ sessionId: roadmapItemSessions.sessionId })
    .from(roadmapItemSessions)
    .where(eq(roadmapItemSessions.roadmapItemId, itemId));

  const linkedIds = links.map((l) => l.sessionId);
  let linkedSessions: Array<{ id: string; idea: string; status: string; mode?: string }> = [];
  if (linkedIds.length > 0) {
    const dbSessions = await db
      .select({ id: sessions.id, idea: sessions.idea, status: sessions.status, mode: sessions.mode })
      .from(sessions);
    linkedSessions = dbSessions
      .filter((s) => linkedIds.includes(s.id))
      .map((s) => ({ id: s.id, idea: s.idea, status: s.status, mode: s.mode ?? undefined }));
  }

  res.json({
    id: item.id,
    userId: item.userId,
    teamId: item.teamId,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    targetQuarter: item.targetQuarter,
    startDate: item.startDate,
    endDate: item.endDate,
    order: item.order,
    linkedSessionIds: linkedIds,
    linkedSessions,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });
});

// Update roadmap item
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const activeTeamId = req.user!.activeTeamId;
  const itemId = req.params.id;
  const { title, description, status, priority, targetQuarter, startDate, endDate, order, linkedSessionIds } = req.body;

  const [item] = await db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.id, itemId));

  if (!item) {
    res.status(404).json({ error: "Roadmap item not found" });
    return;
  }

  // Access check
  if (item.teamId) {
    if (item.teamId !== activeTeamId) {
      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, item.teamId), eq(teamMembers.userId, userId)));
      if (!membership) {
        res.status(404).json({ error: "Roadmap item not found" });
        return;
      }
    }
  } else if (item.userId !== userId) {
    res.status(404).json({ error: "Roadmap item not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (targetQuarter !== undefined) updates.targetQuarter = targetQuarter;
  if (startDate !== undefined) updates.startDate = startDate || null;
  if (endDate !== undefined) updates.endDate = endDate || null;
  if (order !== undefined) updates.order = order;

  const [updated] = await db
    .update(roadmapItems)
    .set(updates)
    .where(eq(roadmapItems.id, itemId))
    .returning();

  // Replace session links if provided
  if (linkedSessionIds !== undefined && Array.isArray(linkedSessionIds)) {
    await db.delete(roadmapItemSessions).where(eq(roadmapItemSessions.roadmapItemId, itemId));
    if (linkedSessionIds.length > 0) {
      await db.insert(roadmapItemSessions).values(
        linkedSessionIds.map((sessionId: string) => ({
          roadmapItemId: itemId,
          sessionId,
        }))
      );
    }
  }

  // Fetch current linked session IDs
  const links = await db
    .select({ sessionId: roadmapItemSessions.sessionId })
    .from(roadmapItemSessions)
    .where(eq(roadmapItemSessions.roadmapItemId, itemId));

  res.json({
    id: updated.id,
    userId: updated.userId,
    teamId: updated.teamId,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    priority: updated.priority,
    targetQuarter: updated.targetQuarter,
    startDate: updated.startDate,
    endDate: updated.endDate,
    order: updated.order,
    linkedSessionIds: links.map((l) => l.sessionId),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Delete roadmap item
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const activeTeamId = req.user!.activeTeamId;
  const itemId = req.params.id;

  const [item] = await db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.id, itemId));

  if (!item) {
    res.status(404).json({ error: "Roadmap item not found" });
    return;
  }

  // Access check
  if (item.teamId) {
    if (item.teamId !== activeTeamId) {
      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, item.teamId), eq(teamMembers.userId, userId)));
      if (!membership) {
        res.status(404).json({ error: "Roadmap item not found" });
        return;
      }
    }
  } else if (item.userId !== userId) {
    res.status(404).json({ error: "Roadmap item not found" });
    return;
  }

  await db.delete(roadmapItems).where(eq(roadmapItems.id, itemId));
  res.json({ success: true });
});

// Search sessions for linking
router.get("/sessions/search", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const q = (req.query.q as string) || "";

  if (!q.trim()) {
    res.json({ sessions: [] });
    return;
  }

  const results = await db
    .select({ id: sessions.id, idea: sessions.idea, status: sessions.status, mode: sessions.mode })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), ilike(sessions.idea, `%${q}%`)))
    .limit(20);

  res.json({
    sessions: results.map((s) => ({ id: s.id, idea: s.idea, status: s.status, mode: s.mode })),
  });
});

export default router;
