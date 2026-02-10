import { Router, Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { projects, sessions } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { ensureDefaultProject } from "../lib/project-helpers";

const router = Router();

// All project routes require authentication
router.use(requireAuth);

// List user's projects with nested session summaries
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const dbProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));

  const dbSessions = await db
    .select({
      id: sessions.id,
      idea: sessions.idea,
      status: sessions.status,
      mode: sessions.mode,
      projectId: sessions.projectId,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));

  // Group sessions by projectId
  const sessionsByProject = new Map<string, typeof dbSessions>();
  for (const s of dbSessions) {
    const pid = s.projectId ?? "__none__";
    if (!sessionsByProject.has(pid)) sessionsByProject.set(pid, []);
    sessionsByProject.get(pid)!.push(s);
  }

  // Sort: "Untitled Project" always last
  const sorted = [...dbProjects].sort((a, b) => {
    if (a.name === "Untitled Project" && b.name !== "Untitled Project") return 1;
    if (b.name === "Untitled Project" && a.name !== "Untitled Project") return -1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const result = sorted.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    sessions: (sessionsByProject.get(p.id) ?? []).map((s) => ({
      id: s.id,
      idea: s.idea,
      status: s.status,
      mode: s.mode,
      createdAt: s.createdAt.toISOString(),
    })),
  }));

  res.json({ projects: result });
});

// Create a new project
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description } = req.body as { name?: string; description?: string };

  const [created] = await db
    .insert(projects)
    .values({
      userId,
      name: name || "Untitled Project",
      description: description || null,
    })
    .returning();

  res.json({
    id: created.id,
    name: created.name,
    description: created.description,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  });
});

// Rename / update description
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;
  const { name, description } = req.body as { name?: string; description?: string };

  // Verify ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, projectId))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Delete a project (reassign sessions to Untitled; refuse to delete Untitled)
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;

  // Verify ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.name === "Untitled Project") {
    res.status(400).json({ error: "Cannot delete the default project" });
    return;
  }

  // Reassign sessions to Untitled Project
  const defaultProjectId = await ensureDefaultProject(userId);
  await db
    .update(sessions)
    .set({ projectId: defaultProjectId })
    .where(eq(sessions.projectId, projectId));

  // Delete the project
  await db.delete(projects).where(eq(projects.id, projectId));

  res.json({ success: true });
});

export default router;
