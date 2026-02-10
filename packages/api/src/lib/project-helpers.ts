import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema";

/**
 * Finds or creates the default "Untitled Project" for a user.
 * Called lazily on session creation when no projectId is provided.
 */
export async function ensureDefaultProject(userId: string): Promise<string> {
  // Check for existing default project
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.name, "Untitled Project")))
    .limit(1);

  if (existing) return existing.id;

  // Create one
  const [created] = await db
    .insert(projects)
    .values({ userId, name: "Untitled Project" })
    .returning({ id: projects.id });

  return created.id;
}
