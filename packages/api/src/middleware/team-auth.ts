import { Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { teamMembers } from "../db/schema";
import type { TeamRole } from "@product-os/shared";

export function requireTeamRole(...allowedRoles: TeamRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { teamId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!teamId) {
      res.status(400).json({ error: "Team ID is required" });
      return;
    }

    const [membership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    if (!membership || !allowedRoles.includes(membership.role as TeamRole)) {
      res.status(403).json({ error: "Insufficient team permissions" });
      return;
    }

    (req as any).teamRole = membership.role;
    next();
  };
}
