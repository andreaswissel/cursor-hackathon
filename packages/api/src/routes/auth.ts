import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, teamMembers, teams } from "../db/schema";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const RAW_API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
const GOOGLE_AUTH_REDIRECT_URI = process.env.GOOGLE_AUTH_REDIRECT_URI || `${API_BASE_URL}/api/auth/google/callback`;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function resolveSystemRole(user: { isAdmin: number; role: "admin" | "beta_tester" | "public_user" }): "admin" | "beta_tester" | "public_user" {
  if (user.role) return user.role;
  return user.isAdmin === 1 ? "admin" : "public_user";
}

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

    const userRole = resolveSystemRole(user);
    const isAdmin = userRole === "admin" || user.isAdmin === 1;
    const token = signToken({ id: user.id, email: user.email, isAdmin, userRole });

    res.json({ token, user: { id: user.id, email: user.email, isAdmin, userRole } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to authenticate" });
  }
});

// Get current user
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!dbUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Fetch user's teams
    const userTeams = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamSlug: teams.slug,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, dbUser.id));

    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        isAdmin: dbUser.isAdmin === 1 || dbUser.role === "admin",
        userRole: resolveSystemRole(dbUser),
        onboardingCompleted: dbUser.onboardingCompleted === 1,
        preferences: dbUser.preferences || null,
        teams: userTeams.map((t) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          teamSlug: t.teamSlug,
          role: t.role,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update user profile
router.put("/profile", requireAuth, async (req: Request, res: Response) => {
  const { displayName, avatarUrl } = req.body as { displayName?: string; avatarUrl?: string };

  const updates: Record<string, unknown> = {};
  if (displayName !== undefined) updates.displayName = displayName?.trim() || null;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
    await db.update(users).set(updates).where(eq(users.id, req.user!.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Update user preferences (onboarding)
router.put("/preferences", requireAuth, async (req: Request, res: Response) => {
  const { preferences, completed } = req.body as {
    preferences: Record<string, unknown>;
    completed?: boolean;
  };

  if (!preferences || typeof preferences !== "object") {
    res.status(400).json({ error: "preferences object is required" });
    return;
  }

  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!dbUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const merged = { ...(dbUser.preferences || {}), ...preferences };
    if (completed) {
      merged.completedAt = new Date().toISOString();
    }

    await db
      .update(users)
      .set({
        preferences: merged,
        ...(completed ? { onboardingCompleted: 1 } : {}),
      })
      .where(eq(users.id, req.user!.id));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update preferences:", error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// Google OAuth - Initiate login
router.get("/google", (req: Request, res: Response) => {
  console.log("[Google OAuth] Starting OAuth flow");
  console.log("[Google OAuth] GOOGLE_AUTH_REDIRECT_URI:", GOOGLE_AUTH_REDIRECT_URI);
  console.log("[Google OAuth] API_BASE_URL:", API_BASE_URL);

  if (!GOOGLE_CLIENT_ID) {
    console.error("[Google OAuth] GOOGLE_CLIENT_ID not configured");
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

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  console.log("[Google OAuth] Redirecting to:", authUrl);
  res.redirect(authUrl);
});

// Google OAuth - Callback
router.get("/google/callback", async (req: Request, res: Response) => {
  console.log("[Google OAuth Callback] Received callback");
  console.log("[Google OAuth Callback] Query params:", req.query);

  const { code, error } = req.query;

  if (error || !code) {
    console.error("[Google OAuth Callback] Error or no code:", error);
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
      console.error("[Google OAuth Callback] Token exchange failed:", err);
      console.error("[Google OAuth Callback] Redirect URI used:", GOOGLE_AUTH_REDIRECT_URI);
      res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("Failed to authenticate with Google")}`);
      return;
    }
    console.log("[Google OAuth Callback] Token exchange successful");

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
      const googleName = googleUser.name || googleUser.given_name || null;
      const googlePicture = googleUser.picture || null;
      [user] = await db
        .insert(users)
        .values({ email, displayName: googleName, avatarUrl: googlePicture })
        .returning();
    }

    // Issue JWT
    const userRole = resolveSystemRole(user);
    const isAdmin = userRole === "admin" || user.isAdmin === 1;
    const token = signToken({ id: user.id, email: user.email, isAdmin, userRole });

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("Authentication failed")}`);
  }
});

export default router;
