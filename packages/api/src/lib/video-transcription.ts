import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
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

// Max file size for Claude vision API (approximately 20MB after base64)
const MAX_CLAUDE_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB raw = ~20MB base64

// Gemini supports much larger files (up to 2GB via File API)
const MAX_GEMINI_INLINE_SIZE = 20 * 1024 * 1024; // 20MB for inline base64

/**
 * Transcribe a video file using the configured LLM provider.
 *
 * Provider support:
 * - Anthropic: Uses Claude vision API (files under 15MB)
 * - OpenAI: Uses Whisper API for audio transcription
 * - Gemini: Uses Gemini Flash with File API (supports large files up to 2GB)
 */
export async function transcribeVideo(
  videoPath: string,
  config: LLMConfig,
  callbacks: TranscriptionCallbacks = {},
  fallbackKeys?: { openaiApiKey?: string; geminiApiKey?: string }
): Promise<TranscriptionResult> {
  const { onProgress, onComplete, onError } = callbacks;

  try {
    onProgress?.(10, "Starting transcription...");

    // Check file size
    const stats = await fs.promises.stat(videoPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    let result: TranscriptionResult;

    // For large files, prefer Gemini (best for video) or OpenAI Whisper
    if (stats.size > MAX_CLAUDE_VIDEO_SIZE) {
      // Try Gemini first (best for large videos with visual context)
      if (config.provider === "gemini" || fallbackKeys?.geminiApiKey) {
        const apiKey = config.provider === "gemini" ? config.apiKey : fallbackKeys!.geminiApiKey!;
        onProgress?.(15, `File is ${fileSizeMB.toFixed(1)}MB - using Gemini Flash for transcription...`);
        result = await transcribeWithGemini(videoPath, apiKey, onProgress);
      }
      // Fall back to OpenAI Whisper (audio only, but handles large files)
      else if (config.provider === "openai" || fallbackKeys?.openaiApiKey) {
        const apiKey = config.provider === "openai" ? config.apiKey : fallbackKeys!.openaiApiKey!;
        onProgress?.(15, `File is ${fileSizeMB.toFixed(1)}MB - using Whisper for transcription...`);
        result = await transcribeWithOpenAI(videoPath, apiKey, onProgress);
      }
      else {
        throw new Error(
          `Video file (${fileSizeMB.toFixed(1)}MB) is too large for Claude vision API. ` +
          `Maximum size is ~15MB. Please configure a Gemini or OpenAI API key in Settings for larger files, ` +
          `or upload a shorter/compressed video.`
        );
      }
    } else {
      switch (config.provider) {
        case "anthropic":
          result = await transcribeWithAnthropic(videoPath, config.apiKey, onProgress);
          break;
        case "openai":
          result = await transcribeWithOpenAI(videoPath, config.apiKey, onProgress);
          break;
        case "gemini":
          result = await transcribeWithGemini(videoPath, config.apiKey, onProgress);
          break;
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
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
 * Transcribe using Google Gemini with video understanding
 * Supports large files via File API
 */
async function transcribeWithGemini(
  videoPath: string,
  apiKey: string,
  onProgress?: (progress: number, message: string) => void
): Promise<TranscriptionResult> {
  const fileManager = new GoogleAIFileManager(apiKey);
  const genAI = new GoogleGenerativeAI(apiKey);

  onProgress?.(20, "Uploading video to Gemini...");

  // Get file info
  const ext = path.extname(videoPath).toLowerCase();
  const mimeTypeMap: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
  };
  const mimeType = mimeTypeMap[ext] || "video/mp4";

  // Upload file to Gemini
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType,
    displayName: path.basename(videoPath),
  });

  onProgress?.(40, "Waiting for video processing...");

  // Wait for file to be processed
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await fileManager.getFile(uploadResult.file.name);
  }

  if (file.state === "FAILED") {
    throw new Error("Gemini failed to process the video file");
  }

  onProgress?.(60, "Transcribing with Gemini Flash...");

  // Use Gemini Flash for fast, cheap transcription
  const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.uri,
      },
    },
    {
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
  ]);

  onProgress?.(80, "Processing transcription...");

  const fullText = result.response.text();

  // Extract just the transcription portion
  const transcriptionMatch = fullText.match(/## Transcription\s*([\s\S]*?)(?=## Visual Context|## Key Sections|$)/i);
  const transcriptionText = transcriptionMatch?.[1]?.trim() || fullText;

  // Clean up - delete the uploaded file
  try {
    await fileManager.deleteFile(uploadResult.file.name);
  } catch {
    // Ignore cleanup errors
  }

  return {
    text: transcriptionText,
    segments: undefined,
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
