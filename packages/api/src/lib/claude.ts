// Backward-compatible wrapper around the new LLM abstraction
// Uses the default Anthropic configuration from env
import {
  streamCompletion as llmStreamCompletion,
  completion as llmCompletion,
  type StreamCallbacks,
  type Message,
  type LLMConfig,
} from "./llm";
import type Anthropic from "@anthropic-ai/sdk";

// Re-export types for backward compatibility
export type { StreamCallbacks };

// Default config uses Anthropic with env key
const defaultConfig: LLMConfig = {
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY || "",
};

// Convert Anthropic message format to our generic format
function convertMessages(messages: Anthropic.MessageParam[]): Message[] {
  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));
}

export async function streamCompletion(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  callbacks: StreamCallbacks,
  config: LLMConfig = defaultConfig
): Promise<string> {
  return llmStreamCompletion(systemPrompt, convertMessages(messages), callbacks, config);
}

export async function completion(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  config: LLMConfig = defaultConfig
): Promise<string> {
  return llmCompletion(systemPrompt, convertMessages(messages), config);
}

// Re-export LLM utilities for direct usage
export { getUserLLMConfig } from "./llm";
export type { LLMConfig } from "./llm";
