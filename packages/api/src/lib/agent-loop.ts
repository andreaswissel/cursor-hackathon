import Anthropic from "@anthropic-ai/sdk";
import type { AgentSandbox, SandboxToolName } from "./sandbox";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;
const DEFAULT_MAX_ITERATIONS = 25;

export interface AgentLoopCallbacks {
  onThinking?: (text: string) => void;
  onToolCall?: (name: string, input: Record<string, unknown>) => void;
  onToolResult?: (name: string, output: string, success: boolean) => void;
  onComplete?: (finalText: string) => void;
  onError?: (error: Error) => void;
}

export interface AgentLoopOptions {
  systemPrompt: string;
  userMessage: string;
  tools: Anthropic.Tool[];
  sandbox: AgentSandbox;
  callbacks?: AgentLoopCallbacks;
  maxIterations?: number;
  apiKey?: string;
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<string> {
  const {
    systemPrompt,
    userMessage,
    tools,
    sandbox,
    callbacks = {},
    maxIterations = DEFAULT_MAX_ITERATIONS,
    apiKey,
  } = options;

  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let finalText = "";

  for (let i = 0; i < maxIterations; i++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools,
        messages,
      });
    } catch (err: any) {
      const error = new Error(`API call failed: ${err.message}`);
      callbacks.onError?.(error);
      throw error;
    }

    // Collect text blocks and tool_use blocks from the response
    const textParts: string[] = [];
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textParts.push(block.text);
        callbacks.onThinking?.(block.text);
      } else if (block.type === "tool_use") {
        toolUseBlocks.push(block);
      }
    }

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
      finalText = textParts.join("\n");
      if (toolUseBlocks.length === 0) {
        callbacks.onComplete?.(finalText);
        return finalText;
      }
    }

    // Push the assistant's response into the message history
    messages.push({ role: "assistant", content: response.content });

    // Execute tool calls and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const toolName = toolUse.name as SandboxToolName;
      const toolInput = toolUse.input as Record<string, unknown>;

      callbacks.onToolCall?.(toolName, toolInput);

      const result = await sandbox.executeTool(toolName, toolInput);
      callbacks.onToolResult?.(toolName, result.output, result.success);

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result.output || result.error || "Done.",
        is_error: !result.success,
      });
    }

    // Push tool results back
    messages.push({ role: "user", content: toolResults });

    // If the model indicated it wanted to stop after the tool calls
    if (response.stop_reason === "end_turn") {
      finalText = textParts.join("\n");
      callbacks.onComplete?.(finalText);
      return finalText;
    }
  }

  // Exceeded max iterations
  finalText += "\n\n[Agent reached maximum iteration limit]";
  callbacks.onComplete?.(finalText);
  return finalText;
}
