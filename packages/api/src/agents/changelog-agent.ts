import { v4 as uuid } from "uuid";
import { sessionStore } from "../lib/session-store";
import { streamCompletion, getUserLLMConfig } from "../lib/claude";
import { db } from "../db";
import { users, outputs } from "../db/schema";
import { eq, inArray } from "drizzle-orm";

const SYSTEM_PROMPT = `You are a changelog writer for a product team. You write clear, user-facing changelog entries.

## Format

Organize entries into these categories (omit empty categories):
- **Added** — new features or capabilities
- **Changed** — changes to existing functionality
- **Fixed** — bug fixes
- **Removed** — removed features or deprecated functionality

## Rules

- Write concise, non-technical language that end users can understand
- Each entry should be a single line starting with a bullet point
- Focus on user impact, not implementation details
- Use present tense ("Add dark mode" not "Added dark mode")
- If referenced session outputs are provided, derive the changelog from those outputs
- If no references, generate a changelog based on the user's message/description`;

export interface ChangelogAgentInput {
  sessionId: string;
  userId: string;
  message: string;
  referencedSessionIds?: string[];
  apiKey?: string;
}

export class ChangelogAgent {
  async run(input: ChangelogAgentInput): Promise<void> {
    const { sessionId, userId, message, referencedSessionIds, apiKey } = input;
    const agentId = uuid();

    await sessionStore.initAgent(sessionId, "changelog-agent", agentId);
    await sessionStore.setAgentStatus(sessionId, "changelog-agent", "running");

    // Create a "generating" artifact
    const artifact = await sessionStore.createArtifact(sessionId, {
      type: "changelog",
      title: "Changelog",
      content: "",
      status: "generating",
    });

    try {
      await sessionStore.appendLog(sessionId, "changelog-agent", "Starting changelog generation...");

      // Gather context from referenced sessions if provided
      let referencedContext = "";
      if (referencedSessionIds && referencedSessionIds.length > 0) {
        await sessionStore.appendLog(sessionId, "changelog-agent", `Fetching context from ${referencedSessionIds.length} referenced session(s)...`);

        const referencedOutputs = await db
          .select({ type: outputs.type, content: outputs.content, sessionId: outputs.sessionId })
          .from(outputs)
          .where(inArray(outputs.sessionId, referencedSessionIds));

        if (referencedOutputs.length > 0) {
          referencedContext = "\n\n## Referenced Session Outputs\n\n" +
            referencedOutputs.map((o) => `### ${o.type} (session ${o.sessionId.slice(0, 8)})\n${o.content}`).join("\n\n");
        }
      }

      // Get user's LLM config for BYOK
      let llmConfig;
      if (apiKey) {
        llmConfig = { provider: "anthropic" as const, apiKey };
      } else {
        const [userRow] = await db
          .select({
            activeProvider: users.activeProvider,
            anthropicApiKey: users.anthropicApiKey,
            openaiApiKey: users.openaiApiKey,
            geminiApiKey: users.geminiApiKey,
          })
          .from(users)
          .where(eq(users.id, userId));
        llmConfig = getUserLLMConfig(userRow || {});
      }

      const messages = [
        {
          role: "user" as const,
          content: `${message}${referencedContext}`,
        },
      ];

      let fullResponse = "";

      await streamCompletion(
        SYSTEM_PROMPT,
        messages,
        {
          onText: (text) => {
            fullResponse += text;
            sessionStore.appendLog(sessionId, "changelog-agent", text);
          },
          onComplete: async () => {
            // Update artifact with final content
            await sessionStore.updateArtifact(sessionId, artifact.id, {
              content: fullResponse,
              status: "ready",
            });

            // Save assistant message
            await sessionStore.addMessage(sessionId, "changelog-agent", "assistant", fullResponse);
            await sessionStore.setAgentStatus(sessionId, "changelog-agent", "completed");
            await sessionStore.appendLog(sessionId, "changelog-agent", "Changelog generation complete.");
          },
          onError: async (error) => {
            await sessionStore.updateArtifact(sessionId, artifact.id, {
              content: `Error: ${error.message}`,
              status: "error",
            });
            await sessionStore.setAgentStatus(sessionId, "changelog-agent", "failed");
          },
        },
        llmConfig
      );
    } catch (err: any) {
      await sessionStore.appendLog(sessionId, "changelog-agent", `Error: ${err.message}`);
      await sessionStore.updateArtifact(sessionId, artifact.id, {
        content: `Error: ${err.message}`,
        status: "error",
      });
      await sessionStore.setAgentStatus(sessionId, "changelog-agent", "failed");
    }
  }
}
