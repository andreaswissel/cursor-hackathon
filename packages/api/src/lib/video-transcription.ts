import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { LLMConfig, Provider } from "./llm";

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionCallbacks {
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Transcribe a video file using the configured LLM provider.
 *
 * Provider support:
 * - Anthropic: Uses Claude vision API with video support
 * - OpenAI: Uses Whisper API for audio transcription
 * - Gemini: Uses multimodal API (requires separate handling)
 */
export async function transcribeVideo(
  videoPath: string,
  config: LLMConfig,
  callbacks: TranscriptionCallbacks = {}
): Promise<TranscriptionResult> {
  const { onProgress, onComplete, onError } = callbacks;

  try {
    onProgress?.(10, "Starting transcription...");

    let result: TranscriptionResult;

    switch (config.provider) {
      case "anthropic":
        result = await transcribeWithAnthropic(videoPath, config.apiKey, onProgress);
        break;
      case "openai":
        result = await transcribeWithOpenAI(videoPath, config.apiKey, onProgress);
        break;
      case "gemini":
        // For now, fall back to Anthropic-style approach for Gemini
        // In production, would use Gemini's video API
        result = await transcribeWithAnthropic(videoPath, config.apiKey, onProgress);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    onProgress?.(100, "Transcription complete");
    onComplete?.(result);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

/**
 * Transcribe using Anthropic Claude with video/vision capabilities
 */
async function transcribeWithAnthropic(
  videoPath: string,
  apiKey: string,
  onProgress?: (progress: number, message: string) => void
): Promise<TranscriptionResult> {
  const client = new Anthropic({ apiKey });

  onProgress?.(20, "Reading video file...");

  // Read the video file and convert to base64
  const videoBuffer = await fs.promises.readFile(videoPath);
  const base64Video = videoBuffer.toString("base64");
  const ext = path.extname(videoPath).toLowerCase();

  // Map extension to media type
  const mediaTypeMap: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
  };
  const mediaType = mediaTypeMap[ext] || "video/mp4";

  onProgress?.(40, "Sending to Claude for analysis...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Video,
            },
          },
          {
            type: "text",
            text: `Please transcribe all spoken content in this video. Include:
1. A complete text transcription of everything said
2. Note any visual elements that provide important context (like UI demonstrations, code being shown, diagrams)
3. If there are distinct sections or topics, indicate where they begin

Format your response as:
## Transcription
[Full transcription here]

## Visual Context
[Description of visual elements that add context]

## Key Sections
[List of distinct sections/topics with approximate timestamps if visible]`,
          },
        ],
      },
    ],
  });

  onProgress?.(80, "Processing transcription...");

  const textBlock = response.content.find((block) => block.type === "text");
  const fullText = textBlock?.text ?? "";

  // Extract just the transcription portion
  const transcriptionMatch = fullText.match(/## Transcription\s*([\s\S]*?)(?=## Visual Context|## Key Sections|$)/i);
  const transcriptionText = transcriptionMatch?.[1]?.trim() || fullText;

  return {
    text: transcriptionText,
    // Note: Claude doesn't provide precise timestamps, but we preserve the full analysis
    segments: undefined,
  };
}

/**
 * Transcribe using OpenAI Whisper API
 * Note: This extracts audio from video and sends to Whisper
 */
async function transcribeWithOpenAI(
  videoPath: string,
  apiKey: string,
  onProgress?: (progress: number, message: string) => void
): Promise<TranscriptionResult> {
  const client = new OpenAI({ apiKey });

  onProgress?.(20, "Preparing video for transcription...");

  // Read the video file
  const videoFile = fs.createReadStream(videoPath);
  const ext = path.extname(videoPath).toLowerCase();
  const filename = `video${ext}`;

  onProgress?.(40, "Sending to Whisper for transcription...");

  // Whisper can handle video files directly (it extracts the audio)
  const transcription = await client.audio.transcriptions.create({
    file: videoFile,
    model: "whisper-1",
    response_format: "verbose_json",
  });

  onProgress?.(80, "Processing transcription...");

  // Extract segments if available
  const segments: TranscriptionSegment[] | undefined =
    (transcription as { segments?: Array<{ start: number; end: number; text: string }> }).segments?.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    }));

  return {
    text: transcription.text,
    segments,
  };
}

/**
 * Get estimated transcription time based on file size
 * Returns estimate in seconds
 */
export function estimateTranscriptionTime(fileSizeBytes: number): number {
  // Rough estimate: 1MB takes about 3-5 seconds to process
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  return Math.ceil(fileSizeMB * 4);
}
