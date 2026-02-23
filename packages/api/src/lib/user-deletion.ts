import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  sessions,
  projects,
  integrations,
  integrationData,
  agentRuns,
  outputs,
  messages,
  documentationPieces,
  discoveryRuns,
  discoveryClusters,
  teamInvites,
  sessionKnowledgeOverrides,
  knowledgeSources,
} from "../db/schema";

export async function deleteUserWithAssociatedData(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const userSessions = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId));
    const sessionIds = userSessions.map((s) => s.id);

    const userIntegrations = await tx
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.userId, userId));
    const integrationIds = userIntegrations.map((i) => i.id);

    if (sessionIds.length > 0) {
      await tx
        .delete(sessionKnowledgeOverrides)
        .where(inArray(sessionKnowledgeOverrides.sessionId, sessionIds));
      await tx.delete(messages).where(inArray(messages.sessionId, sessionIds));
      await tx
        .delete(documentationPieces)
        .where(inArray(documentationPieces.sessionId, sessionIds));
      await tx.delete(outputs).where(inArray(outputs.sessionId, sessionIds));
      await tx.delete(agentRuns).where(inArray(agentRuns.sessionId, sessionIds));
    }
    await tx.delete(sessions).where(eq(sessions.userId, userId));

    if (integrationIds.length > 0) {
      await tx
        .delete(integrationData)
        .where(inArray(integrationData.integrationId, integrationIds));
    }
    await tx.delete(integrations).where(eq(integrations.userId, userId));

    await tx
      .delete(knowledgeSources)
      .where(eq(knowledgeSources.createdByUserId, userId));
    await tx.delete(projects).where(eq(projects.userId, userId));
    await tx.delete(discoveryClusters).where(eq(discoveryClusters.userId, userId));
    await tx.delete(discoveryRuns).where(eq(discoveryRuns.userId, userId));
    await tx.delete(teamInvites).where(eq(teamInvites.invitedByUserId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}

