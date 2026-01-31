import { Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { sessions } from "../db/schema";

const MAX_SESSIONS_PER_USER = 1;
const MAX_PROMPTS_PER_SESSION = 5;

// Check if user can create a new session (max 1)
export async function checkSessionLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const userSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  if (userSessions.length >= MAX_SESSIONS_PER_USER) {
    res.status(429).json({
      error: "Session limit reached",
      message: `You can only have ${MAX_SESSIONS_PER_USER} session. Please use your existing session.`,
      limit: MAX_SESSIONS_PER_USER,
      current: userSessions.length,
    });
    return;
  }

  next();
}

// Check if session has prompts remaining (max 5)
export async function checkPromptLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
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

// Check if user owns the session
export async function checkSessionOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.userId !== userId) {
    res.status(403).json({ error: "You don't have access to this session" });
    return;
  }

  next();
}

// Increment prompt count for a session
export async function incrementPromptCount(sessionId: string): Promise<void> {
  const [session] = await db
    .select({ promptCount: sessions.promptCount })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (session) {
    await db
      .update(sessions)
      .set({ promptCount: session.promptCount + 1 })
      .where(eq(sessions.id, sessionId));
  }
}

// Get user's usage stats
export async function getUserUsageStats(userId: string): Promise<{
  sessionCount: number;
  maxSessions: number;
  canCreateSession: boolean;
}> {
  const userSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  return {
    sessionCount: userSessions.length,
    maxSessions: MAX_SESSIONS_PER_USER,
    canCreateSession: userSessions.length < MAX_SESSIONS_PER_USER,
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
