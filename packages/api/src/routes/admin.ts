import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

// GET /admin/users — list all users
router.get("/users", async (_req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    res.json({
      users: allUsers.map((u) => ({
        ...u,
        isAdmin: u.isAdmin === 1,
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
    const { email, isAdmin } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

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
        isAdmin: isAdmin ? 1 : 0,
      })
      .returning({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      });

    res.status(201).json({
      user: {
        ...created,
        isAdmin: created.isAdmin === 1,
        onboardingCompleted: created.onboardingCompleted === 1,
      },
    });
  } catch (err) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: "Failed to create user" });
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

    await db.delete(users).where(eq(users.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
