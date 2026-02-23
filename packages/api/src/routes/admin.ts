import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { db } from "../db";
import {
  users,
  type AppUserRole,
  waitlist,
} from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { deleteUserWithAssociatedData } from "../lib/user-deletion";

const router = Router();
const VALID_USER_ROLES: AppUserRole[] = ["admin", "beta_tester", "public_user"];

function parseUserRole(value: unknown): AppUserRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return VALID_USER_ROLES.find((role) => role === normalized) ?? null;
}

function toAdminFlag(role: AppUserRole): 0 | 1 {
  return role === "admin" ? 1 : 0;
}

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

// GET /admin/users — list all users
router.get("/users", async (_req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isAdmin: users.isAdmin,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    res.json({
      users: allUsers.map((u) => ({
        ...u,
        isAdmin: u.role === "admin" || u.isAdmin === 1,
        onboardingCompleted: u.onboardingCompleted === 1,
      })),
    });
  } catch (err) {
    console.error("Failed to list users:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// POST /admin/users — create a user
router.post("/users", async (req, res) => {
  try {
    const { email, isAdmin, role } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const parsedRole = parseUserRole(role);
    const userRole: AppUserRole =
      parsedRole ?? (isAdmin ? "admin" : "public_user");

    // Check for duplicate
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const [created] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        role: userRole,
        isAdmin: toAdminFlag(userRole),
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        isAdmin: users.isAdmin,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      });

    res.status(201).json({
      user: {
        ...created,
        isAdmin: created.role === "admin" || created.isAdmin === 1,
        onboardingCompleted: created.onboardingCompleted === 1,
      },
    });
  } catch (err) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PATCH /admin/users/:id/role — update a user's system role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const parsedRole = parseUserRole(req.body?.role);

    if (!parsedRole) {
      res.status(400).json({ error: "Role must be one of: admin, beta_tester, public_user" });
      return;
    }

    if (id === req.user?.id && parsedRole !== "admin") {
      res.status(400).json({ error: "You cannot remove your own admin role" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({
        role: parsedRole,
        isAdmin: toAdminFlag(parsedRole),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        isAdmin: users.isAdmin,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        ...updated,
        isAdmin: updated.role === "admin" || updated.isAdmin === 1,
        onboardingCompleted: updated.onboardingCompleted === 1,
      },
    });
  } catch (err) {
    console.error("Failed to update user role:", err);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// DELETE /admin/users/:id — delete a user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user?.id) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }

    // Verify user exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await deleteUserWithAssociatedData(id);

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET /admin/waitlist — list all waitlist entries
router.get("/waitlist", async (_req, res) => {
  try {
    const entries = await db
      .select()
      .from(waitlist)
      .orderBy(desc(waitlist.createdAt));

    res.json({ entries });
  } catch (err) {
    console.error("Failed to list waitlist:", err);
    res.status(500).json({ error: "Failed to list waitlist entries" });
  }
});

// PATCH /admin/waitlist/:id — update waitlist entry status
router.patch("/waitlist/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["invited", "rejected"].includes(status)) {
      res.status(400).json({ error: "Status must be 'invited' or 'rejected'" });
      return;
    }

    const [updated] = await db
      .update(waitlist)
      .set({ status })
      .where(eq(waitlist.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Waitlist entry not found" });
      return;
    }

    res.json({ entry: updated });
  } catch (err) {
    console.error("Failed to update waitlist entry:", err);
    res.status(500).json({ error: "Failed to update waitlist entry" });
  }
});

export default router;
