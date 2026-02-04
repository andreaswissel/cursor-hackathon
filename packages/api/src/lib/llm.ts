import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type Provider = "anthropic" | "openai" | "gemini";

export interface LLMConfig {
  provider: Provider;
  apiKey: string;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// Default to Anthropic with env key
const defaultConfig: LLMConfig = {
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY || "",
};

const MODELS = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-1.5-pro",
};

export async function streamCompletion(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  config: LLMConfig = defaultConfig
): Promise<string> {
  switch (config.provider) {
    case "anthropic":
      return streamAnthropic(systemPrompt, messages, callbacks, config.apiKey);
    case "openai":
      return streamOpenAI(systemPrompt, messages, callbacks, config.apiKey);
    case "gemini":
      return streamGemini(systemPrompt, messages, callbacks, config.apiKey);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export async function completion(
  systemPrompt: string,
  messages: Message[],
  config: LLMConfig = defaultConfig
): Promise<string> {
  switch (config.provider) {
    case "anthropic":
      return completionAnthropic(systemPrompt, messages, config.apiKey);
    case "openai":
      return completionOpenAI(systemPrompt, messages, config.apiKey);
    case "gemini":
      return completionGemini(systemPrompt, messages, config.apiKey);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// Anthropic implementation
async function streamAnthropic(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  let fullText = "";

  try {
    const stream = client.messages.stream({
      model: MODELS.anthropic,
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullText += event.delta.text;
        callbacks.onText(event.delta.text);
      }
    }

    callbacks.onComplete(fullText);
    return fullText;
  } catch (error) {
    callbacks.onError(error as Error);
    throw error;
  }
}

async function completionAnthropic(
  systemPrompt: string,
  messages: Message[],
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODELS.anthropic,
    max_tokens: 8192,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

// OpenAI implementation
async function streamOpenAI(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  apiKey: string
): Promise<string> {
  const client = new OpenAI({ apiKey });
  let fullText = "";

  try {
    const stream = await client.chat.completions.create({
      model: MODELS.openai,
      max_tokens: 8192,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        fullText += text;
        callbacks.onText(text);
      }
    }

    callbacks.onComplete(fullText);
    return fullText;
  } catch (error) {
    callbacks.onError(error as Error);
    throw error;
  }
}

async function completionOpenAI(
  systemPrompt: string,
  messages: Message[],
  apiKey: string
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: MODELS.openai,
    max_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// Gemini implementation
async function streamGemini(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  apiKey: string
): Promise<string> {
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: MODELS.gemini });
  let fullText = "";

  try {
    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: history as Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
      systemInstruction: systemPrompt,
    });

    const lastMessage = messages[messages.length - 1]?.content || "";
    const result = await chat.sendMessageStream(lastMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        callbacks.onText(text);
      }
    }

    callbacks.onComplete(fullText);
    return fullText;
  } catch (error) {
    callbacks.onError(error as Error);
    throw error;
  }
}

async function completionGemini(
  systemPrompt: string,
  messages: Message[],
  apiKey: string
): Promise<string> {
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: MODELS.gemini });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history: history as Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
    systemInstruction: systemPrompt,
  });

  const lastMessage = messages[messages.length - 1]?.content || "";
  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
}

// Helper to get user's LLM config
export function getUserLLMConfig(user: {
  activeProvider?: Provider | null;
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
}): LLMConfig {
  const provider = user.activeProvider || "anthropic";

  let apiKey: string;
  switch (provider) {
    case "openai":
      apiKey = user.openaiApiKey?.trim() || process.env.OPENAI_API_KEY || "";
      break;
    case "gemini":
      apiKey = user.geminiApiKey?.trim() || process.env.GEMINI_API_KEY || "";
      break;
    case "anthropic":
    default:
      apiKey = user.anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY || "";
      break;
  }

  return { provider, apiKey };
}
