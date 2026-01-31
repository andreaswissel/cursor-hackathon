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

  protected log(content: string): void {
    sessionStore.appendLog(this.sessionId, this.type, content);
  }

  protected async askQuestion(question: string): Promise<string> {
    const questionId = uuid();
    sessionStore.setAgentQuestion(this.sessionId, this.type, questionId, question);

    // This will be resolved when the user answers
    return new Promise((resolve) => {
      const checkAnswer = setInterval(() => {
        const state = sessionStore.getState(this.sessionId);
        const agent = state?.session.agents[this.type];
        if (!agent?.currentQuestion) {
          clearInterval(checkAnswer);
          // Answer was provided and question cleared
          resolve(""); // Will need to get the actual answer from somewhere
        }
      }, 500);
    });
  }

  protected abstract buildMessages(input: AgentInput): Anthropic.MessageParam[];

  protected abstract parseOutput(rawOutput: string): unknown;

  async run(input: AgentInput): Promise<AgentResult> {
    this.sessionId = input.sessionId;
    sessionStore.initAgent(this.sessionId, this.type, this.id);
    sessionStore.setAgentStatus(this.sessionId, this.type, "running");

    this.log(`Starting ${this.type} agent...`);

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
      sessionStore.setAgentOutput(this.sessionId, this.type, output);
      sessionStore.setAgentStatus(this.sessionId, this.type, "completed");

      return { success: true, output };
    } catch (error) {
      sessionStore.setAgentStatus(this.sessionId, this.type, "failed");
      this.log(`\n\n✗ Agent failed: ${(error as Error).message}`);
      return { success: false, output: null };
    }
  }
}
