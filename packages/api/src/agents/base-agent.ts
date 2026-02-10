import { v4 as uuid } from "uuid";
import { streamCompletion } from "../lib/claude";
import { sessionStore, AgentType, SessionContext } from "../lib/session-store";
import Anthropic from "@anthropic-ai/sdk";

export interface AgentInput {
  sessionId: string;
  idea: string;
  context: SessionContext;
  previousOutputs?: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  output: unknown;
  needsInput?: {
    questionId: string;
    question: string;
  };
}

export abstract class BaseAgent {
  abstract type: AgentType;
  abstract systemPrompt: string;

  protected id: string = uuid();
  protected sessionId: string = "";
  protected messages: Anthropic.MessageParam[] = [];

  protected async log(content: string): Promise<void> {
    await sessionStore.appendLog(this.sessionId, this.type, content);
  }

  protected async askQuestion(question: string): Promise<string> {
    const questionId = uuid();
    sessionStore.setAgentQuestion(this.sessionId, this.type, questionId, question);

    // Poll until the question is cleared (answered by user)
    return new Promise((resolve, reject) => {
      let elapsed = 0;
      const TIMEOUT_MS = 10 * 60 * 1000; // 10 minute timeout
      const checkAnswer = setInterval(async () => {
        elapsed += 500;
        if (elapsed > TIMEOUT_MS) {
          clearInterval(checkAnswer);
          reject(new Error("Question timed out waiting for user response"));
          return;
        }
        try {
          const state = await sessionStore.getState(this.sessionId);
          if (!state) {
            clearInterval(checkAnswer);
            resolve("");
            return;
          }
          const agent = state.session.agents[this.type];
          if (!agent?.currentQuestion) {
            clearInterval(checkAnswer);
            // Retrieve the user's answer from the most recent message
            const chatMessages = await sessionStore.getMessages(this.sessionId, this.type);
            const lastUserMessage = chatMessages.filter(m => m.role === "user").pop();
            resolve(lastUserMessage?.content || "");
          }
        } catch {
          // Swallow errors from getState and keep polling
        }
      }, 500);
    });
  }

  protected abstract buildMessages(input: AgentInput): Anthropic.MessageParam[];

  protected abstract parseOutput(rawOutput: string): unknown;

  async run(input: AgentInput): Promise<AgentResult> {
    this.sessionId = input.sessionId;
    await sessionStore.initAgent(this.sessionId, this.type, this.id);
    await sessionStore.setAgentStatus(this.sessionId, this.type, "running");

    await this.log(`Starting ${this.type} agent...`);

    try {
      const messages = this.buildMessages(input);

      const rawOutput = await streamCompletion(
        this.systemPrompt,
        messages,
        {
          onText: (text) => this.log(text),
          onComplete: () => this.log("\n\n✓ Agent completed"),
          onError: (error) => this.log(`\n\n✗ Error: ${error.message}`),
        }
      );

      const output = this.parseOutput(rawOutput);
      await sessionStore.setAgentOutput(this.sessionId, this.type, output);
      await sessionStore.setAgentStatus(this.sessionId, this.type, "completed");

      return { success: true, output };
    } catch (error) {
      await sessionStore.setAgentStatus(this.sessionId, this.type, "failed");
      await this.log(`\n\n✗ Agent failed: ${(error as Error).message}`);
      return { success: false, output: null };
    }
  }
}
