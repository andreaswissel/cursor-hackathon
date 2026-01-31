import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

// Login - email only for demo users, email+password for admin users
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  try {
    // Find existing user
    let [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    // If user exists and has a password, require password auth
    if (user?.passwordHash) {
      if (!password) {
        res.status(401).json({ error: "Password required" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
    } else if (!user) {
      // Create new demo user (no password)
      [user] = await db
        .insert(users)
        .values({ email: email.toLowerCase() })
        .returning();
    }

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin === 1 });

    res.json({ token, user: { id: user.id, email: user.email, isAdmin: user.isAdmin === 1 } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to authenticate" });
  }
});

// Get current user
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
