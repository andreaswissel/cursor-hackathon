import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODEL = "claude-opus-4-5-20250514";

export interface StreamCallbacks {
  onText: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamCompletion(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  callbacks: StreamCallbacks
): Promise<string> {
  let fullText = "";

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const text = event.delta.text;
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

export async function completion(
  systemPrompt: string,
  messages: Anthropic.MessageParam[]
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
