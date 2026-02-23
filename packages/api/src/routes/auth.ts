import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { users, teamMembers, teams } from "../db/schema";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const RAW_API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const GOOGLE_OAUTH_STATE_SECRET =
  process.env.GOOGLE_OAUTH_STATE_SECRET ||
  process.env.JWT_SECRET ||
  "dev-google-oauth-state-secret-change-in-production";

interface GoogleOAuthState {
  redirectUri: string;
  timestamp: number;
}

function signGoogleOAuthState(payload: string): string {
  return createHmac("sha256", GOOGLE_OAUTH_STATE_SECRET).update(payload).digest("base64url");
}

function encodeGoogleOAuthState(state: GoogleOAuthState): string {
  const payload = JSON.stringify(state);
  const signature = signGoogleOAuthState(payload);
  return Buffer.from(JSON.stringify({ payload, signature }), "utf8").toString("base64url");
}

function decodeGoogleOAuthState(rawState: string): GoogleOAuthState {
  const decoded = Buffer.from(rawState, "base64url").toString("utf8");
  const wrapped = JSON.parse(decoded) as { payload?: string; signature?: string };

  if (typeof wrapped.payload !== "string" || typeof wrapped.signature !== "string") {
    throw new Error("Invalid OAuth state");
  }

  const expected = createHmac("sha256", GOOGLE_OAUTH_STATE_SECRET).update(wrapped.payload).digest();
  const actual = Buffer.from(wrapped.signature, "base64url");

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid OAuth state signature");
  }

  return JSON.parse(wrapped.payload) as GoogleOAuthState;
}

function getRequestApiBaseUrl(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const hostHeader = req.headers.host;

  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol || "http";
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || hostHeader || "localhost:3001";
  return `${proto}://${host}`;
}

function getGoogleAuthRedirectUri(req: Request): string {
  // Prefer request-aware callback construction so deploy-domain changes
  // don't require synchronized env updates to avoid redirect_uri_mismatch.
  return `${getRequestApiBaseUrl(req)}/api/auth/google/callback`;
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

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin === 1 });

    res.json({ token, user: { id: user.id, email: user.email, isAdmin: user.isAdmin === 1 } });
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
        isAdmin: dbUser.isAdmin === 1,
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
  const redirectUri = getGoogleAuthRedirectUri(req);
  const state = encodeGoogleOAuthState({
    redirectUri,
    timestamp: Date.now(),
  });

  console.log("[Google OAuth] Starting OAuth flow");
  console.log("[Google OAuth] GOOGLE_AUTH_REDIRECT_URI:", redirectUri);
  console.log("[Google OAuth] API_BASE_URL:", API_BASE_URL);

  if (!GOOGLE_CLIENT_ID) {
    console.error("[Google OAuth] GOOGLE_CLIENT_ID not configured");
    res.status(500).json({ error: "Google OAuth not configured" });
    return;
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
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

  const { code, error, state } = req.query;

  if (error || !code) {
    console.error("[Google OAuth Callback] Error or no code:", error);
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error as string || "OAuth cancelled")}`);
    return;
  }

  try {
    let redirectUri = getGoogleAuthRedirectUri(req);

    if (typeof state === "string") {
      const stateData = decodeGoogleOAuthState(state);
      const maxStateAgeMs = 10 * 60 * 1000;
      if (Date.now() - stateData.timestamp > maxStateAgeMs) {
        throw new Error("OAuth state expired");
      }
      redirectUri = stateData.redirectUri;
    } else {
      throw new Error("Missing OAuth state");
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[Google OAuth Callback] Token exchange failed:", err);
      console.error("[Google OAuth Callback] Redirect URI used:", redirectUri);
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
    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin === 1 });

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("Authentication failed")}`);
  }
});

export default router;
