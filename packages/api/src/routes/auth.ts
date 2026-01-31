import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

// Demo login - just email, no password
router.post("/login", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };

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
    // Find or create user
    let [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email: email.toLowerCase() })
        .returning();
    }

    const token = signToken({ id: user.id, email: user.email });

    res.json({ token, user: { id: user.id, email: user.email } });
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
