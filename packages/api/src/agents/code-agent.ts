import { v4 as uuid } from "uuid";
import { sessionStore } from "../lib/session-store";
import { LocalSandbox, SANDBOX_TOOLS } from "../lib/sandbox";
import { runAgentLoop } from "../lib/agent-loop";

const SYSTEM_PROMPT = `You are an expert software engineer agent. You are given a task to implement in a codebase that has been cloned to your working directory.

## Workflow

1. **Explore first**: Use list_files and read_file to understand the project structure, tech stack, and existing patterns
2. **Plan**: Think through the implementation approach before writing code
3. **Implement**: Write the code changes using write_file
4. **Verify**: Use run_command to run any available tests or type checks
5. **Finalize**: Use create_diff to generate a diff of all your changes

## Rules

- Follow existing code conventions (naming, style, patterns)
- Only modify files that need to change
- Create new files only when necessary
- Keep changes minimal and focused on the task
- Always call create_diff when you're done to generate the final diff
- If you encounter errors, debug and fix them before finalizing`;

export interface CodeAgentInput {
  sessionId: string;
  userId: string;
  message: string;
  repoUrl: string;
  apiKey?: string;
}

export class CodeAgent {
  async run(input: CodeAgentInput): Promise<void> {
    const { sessionId, message, repoUrl, apiKey } = input;
    const agentId = uuid();

    await sessionStore.initAgent(sessionId, "code-agent", agentId);
    await sessionStore.setAgentStatus(sessionId, "code-agent", "running");

    // Create a "generating" plan artifact for UI feedback
    const planArtifact = await sessionStore.createArtifact(sessionId, {
      type: "plan",
      title: "Code Agent Working...",
      content: "Exploring codebase and implementing changes...",
      status: "generating",
    });

    const sandbox = new LocalSandbox({ repoUrl });

    try {
      await sessionStore.appendLog(sessionId, "code-agent", `Cloning repository: ${repoUrl}`);
      await sandbox.initialize();
      await sessionStore.appendLog(sessionId, "code-agent", "Repository cloned successfully");

      const finalText = await runAgentLoop({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: message,
        tools: SANDBOX_TOOLS,
        sandbox,
        apiKey,
        callbacks: {
          onThinking: (text) => {
            sessionStore.appendLog(sessionId, "code-agent", text);
          },
          onToolCall: (name, toolInput) => {
            const summary = name === "read_file"
              ? `Reading ${toolInput.path}`
              : name === "write_file"
              ? `Writing ${toolInput.path}`
              : name === "list_files"
              ? `Listing ${toolInput.path || "."}`
              : name === "run_command"
              ? `Running: ${(toolInput.command as string).slice(0, 80)}`
              : name === "search_code"
              ? `Searching: ${toolInput.pattern}`
              : name === "create_diff"
              ? "Generating diff"
              : name;
            sessionStore.appendLog(sessionId, "code-agent", `Tool: ${summary}`);
          },
          onToolResult: (name, output, success) => {
            if (!success) {
              sessionStore.appendLog(sessionId, "code-agent", `Tool ${name} failed: ${output.slice(0, 200)}`);
            }
          },
          onError: (error) => {
            sessionStore.appendLog(sessionId, "code-agent", `Error: ${error.message}`);
          },
        },
      });

      // Get the diff
      const diff = await sandbox.getDiff();

      // Create code-diff artifact
      if (diff && diff !== "No changes detected.") {
        await sessionStore.createArtifact(sessionId, {
          type: "code-diff",
          title: "Code Changes",
          content: diff,
          status: "ready",
        });
      }

      // Update plan artifact to ready
      await sessionStore.updateArtifact(sessionId, planArtifact.id, {
        title: "Code Agent Complete",
        content: finalText || "Implementation complete. See the code diff artifact for changes.",
        status: "ready",
      });

      // Save assistant message
      await sessionStore.addMessage(sessionId, "code-agent", "assistant", finalText || "Implementation complete.");
      await sessionStore.setAgentStatus(sessionId, "code-agent", "completed");
    } catch (err: any) {
      await sessionStore.appendLog(sessionId, "code-agent", `Error: ${err.message}`);
      await sessionStore.updateArtifact(sessionId, planArtifact.id, {
        title: "Code Agent Failed",
        content: `Error: ${err.message}`,
        status: "error",
      });
      await sessionStore.setAgentStatus(sessionId, "code-agent", "failed");
    } finally {
      await sandbox.dispose();
    }
  }
}
