import { Router, Request, Response } from "express";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import { db } from "../db";
import { projects, sessions, teamMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { ensureDefaultProject } from "../lib/project-helpers";

const router = Router();

// All project routes require authentication
router.use(requireAuth);

// List user's projects with nested session summaries
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const activeTeamId = req.user!.activeTeamId;

  // Ensure every user has a personal default project (legacy-account safeguard)
  const defaultProjectId = await ensureDefaultProject(userId);

  // Backfill legacy sessions that may not have been assigned to a project
  await db
    .update(sessions)
    .set({ projectId: defaultProjectId })
    .where(and(eq(sessions.userId, userId), isNull(sessions.projectId)));

  // Build project query: personal projects + active team projects
  let dbProjects;
  if (activeTeamId) {
    dbProjects = await db
      .select()
      .from(projects)
      .where(
        or(
          and(eq(projects.userId, userId), isNull(projects.teamId)),
          eq(projects.teamId, activeTeamId)
        )
      )
      .orderBy(desc(projects.updatedAt));
  } else {
    dbProjects = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.teamId)))
      .orderBy(desc(projects.updatedAt));
  }

  const projectIds = dbProjects.map((p) => p.id);

  // Get sessions for all visible projects
  let dbSessions: Array<{ id: string; idea: string; status: string; mode: string | null; projectId: string | null; createdAt: Date }> = [];
  if (projectIds.length > 0) {
    const allSessions = await db
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

    dbSessions = allSessions.filter((s) => s.projectId && projectIds.includes(s.projectId));

    // For team projects, also include sessions from other team members
    if (activeTeamId) {
      const teamProjectIds = dbProjects.filter((p) => p.teamId === activeTeamId).map((p) => p.id);
      if (teamProjectIds.length > 0) {
        const teamSessions = await db
          .select({
            id: sessions.id,
            idea: sessions.idea,
            status: sessions.status,
            mode: sessions.mode,
            projectId: sessions.projectId,
            createdAt: sessions.createdAt,
          })
          .from(sessions)
          .orderBy(desc(sessions.createdAt));

        const existingIds = new Set(dbSessions.map((s) => s.id));
        for (const s of teamSessions) {
          if (s.projectId && teamProjectIds.includes(s.projectId) && !existingIds.has(s.id)) {
            dbSessions.push(s);
          }
        }
      }
    }
  }

  // Group sessions by projectId
  const sessionsByProject = new Map<string, typeof dbSessions>();
  for (const s of dbSessions) {
    const pid = s.projectId ?? "__none__";
    if (!sessionsByProject.has(pid)) sessionsByProject.set(pid, []);
    sessionsByProject.get(pid)!.push(s);
  }

  // Sort: "Drafts" always last
  const sorted = [...dbProjects].sort((a, b) => {
    if (a.name === "Drafts" && b.name !== "Drafts") return 1;
    if (b.name === "Drafts" && a.name !== "Drafts") return -1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const result = sorted.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    repoUrl: p.repoUrl,
    teamId: p.teamId,
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
  const { name, description, teamId, repoUrl } = req.body as { name?: string; description?: string; teamId?: string; repoUrl?: string };

  // If teamId provided, verify user is a team member
  if (teamId) {
    const [membership] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this team" });
      return;
    }
  }

  const [created] = await db
    .insert(projects)
    .values({
      userId,
      teamId: teamId || null,
      name: name || "Drafts",
      description: description || null,
      repoUrl: repoUrl || null,
    })
    .returning();

  res.json({
    id: created.id,
    name: created.name,
    description: created.description,
    repoUrl: created.repoUrl,
    teamId: created.teamId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  });
});

// Update project (rename, description, team assignment)
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;
  const { name, description, teamId, repoUrl } = req.body as { name?: string; description?: string; teamId?: string | null; repoUrl?: string | null };

  // Find project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Access check: personal project → owner only; team project → any member
  if (project.teamId) {
    const [membership] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId)));
    if (!membership) {
      res.status(403).json({ error: "Not a team member" });
      return;
    }
  } else if (project.userId !== userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // If moving to a team, verify the user is a member of the target team
  if (teamId !== undefined && teamId !== null) {
    const [membership] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    if (!membership) {
      res.status(403).json({ error: "You are not a member of this team" });
      return;
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (teamId !== undefined) updates.teamId = teamId;
  if (repoUrl !== undefined) updates.repoUrl = repoUrl;

  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, projectId))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    repoUrl: updated.repoUrl,
    teamId: updated.teamId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Delete a project (reassign sessions to Untitled; refuse to delete Untitled)
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;

  // Find project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Access check: personal → owner only; team → owner/admin only
  if (project.teamId) {
    const [membership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId)));
    if (!membership || membership.role === "member") {
      res.status(403).json({ error: "Only team owners and admins can delete team projects" });
      return;
    }
  } else if (project.userId !== userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.name === "Drafts") {
    res.status(400).json({ error: "Cannot delete the default project" });
    return;
  }

  try {
    // Reassign sessions to Drafts
    const defaultProjectId = await ensureDefaultProject(userId);
    await db
      .update(sessions)
      .set({ projectId: defaultProjectId })
      .where(eq(sessions.projectId, projectId));

    // knowledge_sources cascade-deletes automatically via FK
    // Delete the project
    await db.delete(projects).where(eq(projects.id, projectId));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    res.status(500).json({ error: "Failed to delete project. Please try again." });
  }
});

export default router;
