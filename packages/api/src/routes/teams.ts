import { Router, Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { teams, teamMembers, teamInvites, users } from "../db/schema";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { requireTeamRole } from "../middleware/team-auth";

const router = Router();

// --- Helper: generate a URL-safe slug from a name ---
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "team";
  const [existing] = await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, slug));
  if (!existing) return slug;
  return `${slug}-${uuid().slice(0, 8)}`;
}

// ============================================================
// Team CRUD
// ============================================================

// Create a team (caller becomes owner)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name } = req.body as { name?: string };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Team name is required" });
    return;
  }

  const slug = await uniqueSlug(name.trim());

  const [team] = await db
    .insert(teams)
    .values({ name: name.trim(), slug })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId,
    role: "owner",
  });

  res.json({
    id: team.id,
    name: team.name,
    slug: team.slug,
    avatarUrl: team.avatarUrl,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  });
});

// List user's teams
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const rows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      teamSlug: teams.slug,
      teamAvatarUrl: teams.avatarUrl,
      teamCreatedAt: teams.createdAt,
      teamUpdatedAt: teams.updatedAt,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .orderBy(desc(teams.createdAt));

  res.json({
    teams: rows.map((r) => ({
      id: r.teamId,
      name: r.teamName,
      slug: r.teamSlug,
      avatarUrl: r.teamAvatarUrl,
      role: r.role,
      createdAt: r.teamCreatedAt.toISOString(),
      updatedAt: r.teamUpdatedAt.toISOString(),
    })),
  });
});

// Get team details + members + pending invites
router.get("/:teamId", requireAuth, requireTeamRole("owner", "admin", "member"), async (req: Request, res: Response) => {
  const { teamId } = req.params;

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  const members = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  const invites = await db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.teamId, teamId), eq(teamInvites.status, "pending")));

  res.json({
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      avatarUrl: team.avatarUrl,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    },
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      user: { id: m.userId, email: m.email, displayName: m.displayName, avatarUrl: m.avatarUrl },
    })),
    invites: invites.map((i) => ({
      id: i.id,
      invitedEmail: i.invitedEmail,
      role: i.role,
      status: i.status,
      token: i.token,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  });
});

// Update team (name, slug, avatar)
router.patch("/:teamId", requireAuth, requireTeamRole("owner", "admin"), async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { name, slug, avatarUrl } = req.body as { name?: string; slug?: string; avatarUrl?: string };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name.trim();
  if (slug !== undefined) {
    const newSlug = slugify(slug);
    const [existing] = await db.select({ id: teams.id }).from(teams).where(and(eq(teams.slug, newSlug)));
    if (existing && existing.id !== teamId) {
      res.status(409).json({ error: "Slug already taken" });
      return;
    }
    updates.slug = newSlug;
  }
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const [updated] = await db.update(teams).set(updates).where(eq(teams.id, teamId)).returning();

  res.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    avatarUrl: updated.avatarUrl,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Delete team (owner only)
router.delete("/:teamId", requireAuth, requireTeamRole("owner"), async (req: Request, res: Response) => {
  const { teamId } = req.params;
  await db.delete(teams).where(eq(teams.id, teamId));
  res.json({ success: true });
});

// ============================================================
// Member management
// ============================================================

// Change member role
router.patch("/:teamId/members/:userId", requireAuth, requireTeamRole("owner", "admin"), async (req: Request, res: Response) => {
  const { teamId, userId } = req.params;
  const { role } = req.body as { role?: string };

  if (!role || !["owner", "admin", "member"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  // Cannot demote the last owner
  if (role !== "owner") {
    const owners = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "owner")));

    if (owners.length === 1 && owners[0].userId === userId) {
      res.status(400).json({ error: "Cannot demote the last owner" });
      return;
    }
  }

  const [updated] = await db
    .update(teamMembers)
    .set({ role: role as "owner" | "admin" | "member" })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json({ id: updated.id, userId: updated.userId, role: updated.role });
});

// Remove member
router.delete("/:teamId/members/:userId", requireAuth, requireTeamRole("owner", "admin"), async (req: Request, res: Response) => {
  const { teamId, userId } = req.params;
  const actorId = req.user!.id;

  // Owner cannot remove self
  const [target] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  if (!target) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  if (target.role === "owner" && userId === actorId) {
    res.status(400).json({ error: "Owner cannot remove themselves" });
    return;
  }

  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  res.json({ success: true });
});

// ============================================================
// Invites (team-scoped)
// ============================================================

// Create invite
router.post("/:teamId/invites", requireAuth, requireTeamRole("owner", "admin"), async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const userId = req.user!.id;
  const { email, role } = req.body as { email?: string; role?: string };

  const inviteRole = role && ["owner", "admin", "member"].includes(role) ? role : "member";
  const token = uuid();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invite] = await db
    .insert(teamInvites)
    .values({
      teamId,
      invitedByUserId: userId,
      invitedEmail: email?.toLowerCase() || null,
      role: inviteRole as "owner" | "admin" | "member",
      token,
      expiresAt,
    })
    .returning();

  res.json({
    id: invite.id,
    teamId: invite.teamId,
    invitedEmail: invite.invitedEmail,
    role: invite.role,
    status: invite.status,
    token: invite.token,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  });
});

// List pending invites for a team
router.get("/:teamId/invites", requireAuth, requireTeamRole("owner", "admin"), async (req: Request, res: Response) => {
  const { teamId } = req.params;

  const invites = await db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.teamId, teamId), eq(teamInvites.status, "pending")))
    .orderBy(desc(teamInvites.createdAt));

  res.json({
    invites: invites.map((i) => ({
      id: i.id,
      invitedEmail: i.invitedEmail,
      role: i.role,
      status: i.status,
      token: i.token,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  });
});

// Revoke invite
router.delete("/:teamId/invites/:id", requireAuth, requireTeamRole("owner", "admin"), async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(teamInvites).where(eq(teamInvites.id, id));
  res.json({ success: true });
});

// ============================================================
// Invite acceptance (user-scoped, mounted outside /teams)
// ============================================================

export const inviteRouter = Router();

// Get my pending invites (by email match)
inviteRouter.get("/pending", requireAuth, async (req: Request, res: Response) => {
  const userEmail = req.user!.email;

  const invites = await db
    .select({
      id: teamInvites.id,
      teamId: teamInvites.teamId,
      invitedEmail: teamInvites.invitedEmail,
      role: teamInvites.role,
      status: teamInvites.status,
      token: teamInvites.token,
      expiresAt: teamInvites.expiresAt,
      createdAt: teamInvites.createdAt,
      teamName: teams.name,
      teamSlug: teams.slug,
      teamAvatarUrl: teams.avatarUrl,
      invitedByEmail: users.email,
      invitedByDisplayName: users.displayName,
    })
    .from(teamInvites)
    .innerJoin(teams, eq(teamInvites.teamId, teams.id))
    .innerJoin(users, eq(teamInvites.invitedByUserId, users.id))
    .where(and(eq(teamInvites.invitedEmail, userEmail.toLowerCase()), eq(teamInvites.status, "pending")));

  // Filter out expired
  const now = new Date();
  const valid = invites.filter((i) => i.expiresAt > now);

  res.json({
    invites: valid.map((i) => ({
      id: i.id,
      teamId: i.teamId,
      invitedEmail: i.invitedEmail,
      role: i.role,
      status: i.status,
      token: i.token,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
      team: { id: i.teamId, name: i.teamName, slug: i.teamSlug, avatarUrl: i.teamAvatarUrl },
      invitedBy: { email: i.invitedByEmail, displayName: i.invitedByDisplayName },
    })),
  });
});

// Get invite details by token (public — for landing page)
inviteRouter.get("/:token", optionalAuth, async (req: Request, res: Response) => {
  const { token } = req.params;

  const [invite] = await db
    .select({
      id: teamInvites.id,
      teamId: teamInvites.teamId,
      invitedEmail: teamInvites.invitedEmail,
      role: teamInvites.role,
      status: teamInvites.status,
      token: teamInvites.token,
      expiresAt: teamInvites.expiresAt,
      createdAt: teamInvites.createdAt,
      teamName: teams.name,
      teamSlug: teams.slug,
      teamAvatarUrl: teams.avatarUrl,
      invitedByEmail: users.email,
      invitedByDisplayName: users.displayName,
    })
    .from(teamInvites)
    .innerJoin(teams, eq(teamInvites.teamId, teams.id))
    .innerJoin(users, eq(teamInvites.invitedByUserId, users.id))
    .where(eq(teamInvites.token, token));

  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  if (invite.status !== "pending" || invite.expiresAt < new Date()) {
    res.status(410).json({ error: "Invite has expired or is no longer valid" });
    return;
  }

  res.json({
    id: invite.id,
    teamId: invite.teamId,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    team: { id: invite.teamId, name: invite.teamName, slug: invite.teamSlug, avatarUrl: invite.teamAvatarUrl },
    invitedBy: { email: invite.invitedByEmail, displayName: invite.invitedByDisplayName },
  });
});

// Accept invite
inviteRouter.post("/:token/accept", requireAuth, async (req: Request, res: Response) => {
  const { token } = req.params;
  const userId = req.user!.id;

  const [invite] = await db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.token, token), eq(teamInvites.status, "pending")));

  if (!invite) {
    res.status(404).json({ error: "Invite not found or already used" });
    return;
  }

  if (invite.expiresAt < new Date()) {
    await db.update(teamInvites).set({ status: "expired" }).where(eq(teamInvites.id, invite.id));
    res.status(410).json({ error: "Invite has expired" });
    return;
  }

  // Check if already a member
  const [existing] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, invite.teamId), eq(teamMembers.userId, userId)));

  if (existing) {
    await db.update(teamInvites).set({ status: "accepted" }).where(eq(teamInvites.id, invite.id));
    res.json({ success: true, alreadyMember: true });
    return;
  }

  // Insert member + update invite status
  await db.insert(teamMembers).values({
    teamId: invite.teamId,
    userId,
    role: invite.role as "owner" | "admin" | "member",
  });

  await db.update(teamInvites).set({ status: "accepted" }).where(eq(teamInvites.id, invite.id));

  res.json({ success: true, teamId: invite.teamId });
});

// Decline invite
inviteRouter.post("/:token/decline", requireAuth, async (req: Request, res: Response) => {
  const { token } = req.params;

  const [invite] = await db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.token, token), eq(teamInvites.status, "pending")));

  if (!invite) {
    res.status(404).json({ error: "Invite not found or already used" });
    return;
  }

  await db.update(teamInvites).set({ status: "declined" }).where(eq(teamInvites.id, invite.id));
  res.json({ success: true });
});

export default router;
