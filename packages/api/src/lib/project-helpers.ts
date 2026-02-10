import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema";

/**
 * Finds or creates the default "Untitled Project" for a user (or team).
 * Called lazily on session creation when no projectId is provided.
 */
export async function ensureDefaultProject(userId: string, teamId?: string): Promise<string> {
  if (teamId) {
    // Team-scoped default project
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.teamId, teamId), eq(projects.name, "Untitled Project")))
      .limit(1);

    if (existing) return existing.id;

    const [created] = await db
      .insert(projects)
      .values({ userId, teamId, name: "Untitled Project" })
      .returning({ id: projects.id });

    return created.id;
  }

  // Personal default project
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.name, "Untitled Project"), isNull(projects.teamId)))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(projects)
    .values({ userId, name: "Untitled Project" })
    .returning({ id: projects.id });

  return created.id;
}
