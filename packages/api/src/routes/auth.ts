import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const GOOGLE_AUTH_REDIRECT_URI = process.env.GOOGLE_AUTH_REDIRECT_URI || `${API_BASE_URL}/api/auth/google/callback`;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

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

// Google OAuth - Initiate login
router.get("/google", (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ error: "Google OAuth not configured" });
    return;
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_AUTH_REDIRECT_URI,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "),
    access_type: "online",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Google OAuth - Callback
router.get("/google/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error || !code) {
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error as string || "OAuth cancelled")}`);
    return;
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code as string,
        redirect_uri: GOOGLE_AUTH_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Google token exchange failed:", err);
      res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("Failed to authenticate with Google")}`);
      return;
    }

    const tokens = await tokenRes.json();

    // Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("Failed to get user info")}`);
      return;
    }

    const googleUser = await userInfoRes.json();
    const email = googleUser.email?.toLowerCase();

    if (!email) {
      res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("No email from Google")}`);
      return;
    }

    // Find or create user
    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email })
        .returning();
    }

    // Issue JWT
    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin === 1 });

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("Authentication failed")}`);
  }
});

export default router;
