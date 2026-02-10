import { Request, Response, NextFunction } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";

const MAX_SESSIONS_PER_USER = 5;
const MAX_PROMPTS_PER_SESSION = 5;

// Check if user has any API key configured (bypass limits)
async function userHasApiKey(userId: string): Promise<boolean> {
  const [user] = await db
    .select({
      anthropicApiKey: users.anthropicApiKey,
      openaiApiKey: users.openaiApiKey,
      geminiApiKey: users.geminiApiKey,
    })
    .from(users)
    .where(eq(users.id, userId));

  return !!(user?.anthropicApiKey || user?.openaiApiKey || user?.geminiApiKey);
}

// Check if user can create a new session (max 1, unlimited for admins or BYOK users)
export async function checkSessionLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Admin users have unlimited sessions
  if (req.user?.isAdmin) {
    next();
    return;
  }

  // Users with their own API key have unlimited sessions
  if (await userHasApiKey(userId)) {
    next();
    return;
  }

  const userSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  if (userSessions.length >= MAX_SESSIONS_PER_USER) {
    res.status(429).json({
      error: "Session limit reached",
      message: `You can only have ${MAX_SESSIONS_PER_USER} sessions. Please use an existing session.`,
      limit: MAX_SESSIONS_PER_USER,
      current: userSessions.length,
    });
    return;
  }

  next();
}

// Check if session has prompts remaining (max 5, unlimited for admins or BYOK users)
export async function checkPromptLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;

  // Admin users have unlimited prompts
  if (req.user?.isAdmin) {
    next();
    return;
  }

  // Users with their own API key have unlimited prompts
  if (userId && await userHasApiKey(userId)) {
    next();
    return;
  }

  const { sessionId } = req.params;

  const [session] = await db
    .select({ promptCount: sessions.promptCount })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.promptCount >= MAX_PROMPTS_PER_SESSION) {
    res.status(429).json({
      error: "Prompt limit reached",
      message: `You've used all ${MAX_PROMPTS_PER_SESSION} prompts for this session.`,
      limit: MAX_PROMPTS_PER_SESSION,
      current: session.promptCount,
    });
    return;
  }

  next();
}

// Check if user owns the session or has team access
export async function checkSessionOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [session] = await db
    .select({ userId: sessions.userId, projectId: sessions.projectId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Direct owner
  if (session.userId === userId) {
    next();
    return;
  }

  // Team access: check if the session's project is a team project the user belongs to
  if (session.projectId) {
    const { projects, teamMembers } = await import("../db/schema");
    const { and: andOp } = await import("drizzle-orm");

    const [project] = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, session.projectId));

    if (project?.teamId) {
      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(andOp(eq(teamMembers.teamId, project.teamId), eq(teamMembers.userId, userId)));

      if (membership) {
        next();
        return;
      }
    }
  }

  res.status(403).json({ error: "You don't have access to this session" });
}

// Increment prompt count for a session (atomic)
export async function incrementPromptCount(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ promptCount: sql`${sessions.promptCount} + 1` })
    .where(eq(sessions.id, sessionId));
}

// Get user's usage stats
export async function getUserUsageStats(userId: string, isAdmin?: boolean): Promise<{
  sessionCount: number;
  maxSessions: number | null; // null means unlimited
  canCreateSession: boolean;
  hasApiKey: boolean;
  unlimited: boolean;
}> {
  const [userSessions, hasKey] = await Promise.all([
    db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId)),
    userHasApiKey(userId),
  ]);

  const unlimited = isAdmin || hasKey;

  return {
    sessionCount: userSessions.length,
    maxSessions: unlimited ? null : MAX_SESSIONS_PER_USER, // null = unlimited
    canCreateSession: unlimited || userSessions.length < MAX_SESSIONS_PER_USER,
    hasApiKey: hasKey,
    unlimited,
  };
}

// Get session usage stats
export async function getSessionUsageStats(sessionId: string): Promise<{
  promptCount: number;
  maxPrompts: number;
  canSendPrompt: boolean;
} | null> {
  const [session] = await db
    .select({ promptCount: sessions.promptCount })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) return null;

  return {
    promptCount: session.promptCount,
    maxPrompts: MAX_PROMPTS_PER_SESSION,
    canSendPrompt: session.promptCount < MAX_PROMPTS_PER_SESSION,
  };
}
