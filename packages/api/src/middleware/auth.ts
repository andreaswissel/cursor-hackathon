import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { TeamRole } from "@product-os/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { teamMembers, users, type AppUserRole } from "../db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin?: boolean;
  userRole?: AppUserRole;
  activeTeamId?: string | null;
  teamRole?: TeamRole | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Also check query param for SSE connections
  const queryToken = req.query.token as string | undefined;

  const tokenToVerify = token || queryToken;

  if (!tokenToVerify) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = verifyToken(tokenToVerify);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = {
    ...user,
    id: dbUser.id,
    email: dbUser.email,
    isAdmin: dbUser.isAdmin === 1 || dbUser.role === "admin",
    userRole: dbUser.role,
  };

  // Check X-Team-Id header for team context
  const teamIdHeader = req.headers["x-team-id"] as string | undefined;
  if (teamIdHeader) {
    try {
      const [membership] = await db
        .select({ role: teamMembers.role })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamIdHeader), eq(teamMembers.userId, dbUser.id)));

      if (membership) {
        req.user.activeTeamId = teamIdHeader;
        req.user.teamRole = membership.role as TeamRole;
      }
    } catch {
      // Silently ignore — no team context
    }
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!(req.user?.isAdmin || req.user?.userRole === "admin")) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = req.query.token as string | undefined;

  const tokenToVerify = token || queryToken;

  if (tokenToVerify) {
    const user = verifyToken(tokenToVerify);
    if (user) {
      req.user = user;
    }
  }

  next();
}
