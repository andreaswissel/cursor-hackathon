import { v4 as uuid } from "uuid";
import { sessionStore } from "../lib/session-store";
import { createSandbox, getReadOnlyTools } from "../lib/sandbox";
import { runAgentLoop } from "../lib/agent-loop";

const SYSTEM_PROMPT = `You are an expert code reviewer agent. You are given a codebase to review and a specific review request. The repository has been cloned to your working directory.

## Workflow

1. **Explore**: Use list_files and read_file to understand the project structure
2. **Analyze**: Read the relevant files based on the review request
3. **Search**: Use search_code to find patterns, potential issues, or related code
4. **Report**: Provide a detailed review with your findings

## Review Focus Areas

- Code correctness and potential bugs
- Security vulnerabilities (injection, XSS, auth issues, etc.)
- Performance bottlenecks
- Error handling gaps
- Code style and maintainability
- Missing tests or edge cases

## Rules

- Do NOT modify any files — you are in read-only mode
- Be specific: reference file paths and line numbers
- Categorize findings by severity: critical, warning, info
- Provide actionable recommendations
- Focus on the areas requested by the user`;

export interface ReviewAgentInput {
  sessionId: string;
  userId: string;
  message: string;
  repoUrl: string;
  apiKey?: string;
}

export class ReviewAgent {
  async run(input: ReviewAgentInput): Promise<void> {
    const { sessionId, message, repoUrl, apiKey } = input;
    const agentId = uuid();

    await sessionStore.initAgent(sessionId, "review-agent", agentId);
    await sessionStore.setAgentStatus(sessionId, "review-agent", "running");

    // Create a "generating" artifact for UI feedback
    const reviewArtifact = await sessionStore.createArtifact(sessionId, {
      type: "review",
      title: "Code Review in Progress...",
      content: "Analyzing codebase...",
      status: "generating",
    });

    const sandbox = createSandbox({ repoUrl });

    try {
      await sessionStore.appendLog(sessionId, "review-agent", `Cloning repository: ${repoUrl}`);
      await sandbox.initialize();
      await sessionStore.appendLog(sessionId, "review-agent", "Repository cloned successfully");

      const readOnlyTools = getReadOnlyTools();

      const finalText = await runAgentLoop({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: message,
        tools: readOnlyTools,
        sandbox,
        apiKey,
        callbacks: {
          onThinking: (text) => {
            sessionStore.appendLog(sessionId, "review-agent", text);
          },
          onToolCall: (name, toolInput) => {
            const summary = name === "read_file"
              ? `Reading ${toolInput.path}`
              : name === "list_files"
              ? `Listing ${toolInput.path || "."}`
              : name === "run_command"
              ? `Running: ${(toolInput.command as string).slice(0, 80)}`
              : name === "search_code"
              ? `Searching: ${toolInput.pattern}`
              : name;
            sessionStore.appendLog(sessionId, "review-agent", `Tool: ${summary}`);
          },
          onToolResult: (name, output, success) => {
            if (!success) {
              sessionStore.appendLog(sessionId, "review-agent", `Tool ${name} failed: ${output.slice(0, 200)}`);
            }
          },
          onError: (error) => {
            sessionStore.appendLog(sessionId, "review-agent", `Error: ${error.message}`);
          },
        },
      });

      // Update review artifact with findings
      await sessionStore.updateArtifact(sessionId, reviewArtifact.id, {
        title: "Code Review",
        content: finalText || "Review complete. No significant findings.",
        status: "ready",
      });

      // Save assistant message
      await sessionStore.addMessage(sessionId, "review-agent", "assistant", finalText || "Review complete.");
      await sessionStore.setAgentStatus(sessionId, "review-agent", "completed");
    } catch (err: any) {
      await sessionStore.appendLog(sessionId, "review-agent", `Error: ${err.message}`);
      await sessionStore.updateArtifact(sessionId, reviewArtifact.id, {
        title: "Code Review Failed",
        content: `Error: ${err.message}`,
        status: "error",
      });
      await sessionStore.setAgentStatus(sessionId, "review-agent", "failed");
    } finally {
      await sandbox.dispose();
    }
  }
}
