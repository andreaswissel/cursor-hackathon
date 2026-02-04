import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { LLMConfig } from "./llm";
import {
  preprocessVideo,
  cleanupPreprocessedVideo,
  readFramesAsBase64,
  checkFfmpegAvailable,
  PreprocessedVideo,
} from "./video-preprocessing";

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export type VisualAnalysisProvider = "claude-haiku" | "gpt-5-mini" | "claude-haiku-env";

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  visualContext?: string;
  visualProvider?: VisualAnalysisProvider;
}

export interface TranscriptionCallbacks {
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
}

export interface TranscriptionKeys {
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

/**
 * Transcribe a video file using preprocessing + vision models.
 *
 * Pipeline:
 * 1. Preprocess: Extract frames (1fps) + audio using ffmpeg
 * 2. Transcribe: Use Whisper for audio transcription
 * 3. Analyze: Use Claude Haiku or GPT-5 mini to analyze frames with transcription context
 *
 * Fallback chain for visual analysis:
 * 1. Claude Haiku (user's anthropic key)
 * 2. GPT-5 mini (user's openai key)
 * 3. Claude Haiku (env ANTHROPIC_API_KEY)
 */
export async function transcribeVideo(
  videoPath: string,
  config: LLMConfig,
  callbacks: TranscriptionCallbacks = {},
  fallbackKeys?: TranscriptionKeys
): Promise<TranscriptionResult> {
  const { onProgress, onComplete, onError } = callbacks;

  let preprocessed: PreprocessedVideo | null = null;

  try {
    onProgress?.(5, "Checking ffmpeg availability...");

    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      throw new Error(
        "ffmpeg is not installed. Please install ffmpeg to process videos.\n" +
        "On macOS: brew install ffmpeg\n" +
        "On Ubuntu: apt install ffmpeg\n" +
        "On Railway: Add ffmpeg to your nixpacks.toml"
      );
    }

    // Get API keys - collect all available keys
    const userAnthropicKey = config.provider === "anthropic" ? config.apiKey : fallbackKeys?.anthropicApiKey;
    const userOpenaiKey = config.provider === "openai" ? config.apiKey : fallbackKeys?.openaiApiKey;
    const envAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const envOpenaiKey = process.env.OPENAI_API_KEY;

    // Need at least one OpenAI key for Whisper
    const whisperKey = userOpenaiKey || envOpenaiKey;
    if (!whisperKey) {
      throw new Error(
        "OpenAI API key is required for video transcription (Whisper).\n" +
        "Please add your OpenAI API key in Settings."
      );
    }

    // Step 1: Preprocess video
    onProgress?.(10, "Preprocessing video (extracting frames and audio)...");
    preprocessed = await preprocessVideo(videoPath, {
      fps: 1, // 1 frame per second
      audioFormat: "mp3",
      maxFrames: 300, // Max 5 minutes at 1fps (hard limit)
      onProgress: (p, msg) => {
        // Map preprocessing progress to 10-40%
        const mappedProgress = 10 + Math.floor(p * 0.3);
        onProgress?.(mappedProgress, msg);
      },
    });

    onProgress?.(40, `Extracted ${preprocessed.frames.length} frames, transcribing audio...`);

    // Step 2: Transcribe audio with Whisper
    const audioTranscription = await transcribeAudioWithWhisper(
      preprocessed.audioPath,
      whisperKey,
      onProgress
    );

    onProgress?.(60, "Analyzing video frames with visual context...");

    // Step 3: Analyze frames with vision model (with fallback chain)
    const { visualAnalysis, provider } = await analyzeFramesWithFallback(
      preprocessed.frames,
      audioTranscription.text,
      {
        userAnthropicKey,
        userOpenaiKey,
        envAnthropicKey,
      },
      onProgress
    );

    onProgress?.(95, "Finalizing transcription...");

    // Combine results
    const result: TranscriptionResult = {
      text: audioTranscription.text,
      segments: audioTranscription.segments,
      visualContext: visualAnalysis,
      visualProvider: provider,
    };

    onProgress?.(100, `Transcription complete (visual analysis: ${provider})`);
    onComplete?.(result);

    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  } finally {
    // Always cleanup preprocessed files
    if (preprocessed) {
      await cleanupPreprocessedVideo(preprocessed);
    }
  }
}

interface AnalysisKeys {
  userAnthropicKey?: string;
  userOpenaiKey?: string;
  envAnthropicKey?: string;
}

/**
 * Analyze frames with fallback chain:
 * 1. Claude Haiku (user key)
 * 2. GPT-5 mini (user key)
 * 3. Claude Haiku (env key)
 */
async function analyzeFramesWithFallback(
  framePaths: string[],
  transcription: string,
  keys: AnalysisKeys,
  onProgress?: (progress: number, message: string) => void
): Promise<{ visualAnalysis: string; provider: VisualAnalysisProvider }> {
  const errors: string[] = [];

  // Try 1: Claude Haiku with user's key
  if (keys.userAnthropicKey) {
    try {
      onProgress?.(65, "Trying Claude 4.5 Haiku (user key)...");
      const result = await analyzeFramesWithClaude(
        framePaths,
        transcription,
        keys.userAnthropicKey,
        onProgress
      );
      return { visualAnalysis: result, provider: "claude-haiku" };
    } catch (error) {
      const msg = (error as Error).message;
      errors.push(`Claude Haiku (user): ${msg.slice(0, 100)}`);
      console.error("Claude Haiku (user key) failed:", error);
    }
  }

  // Try 2: GPT-5 mini with user's key
  if (keys.userOpenaiKey) {
    try {
      onProgress?.(65, "Trying GPT-5 mini (user key)...");
      const result = await analyzeFramesWithOpenAI(
        framePaths,
        transcription,
        keys.userOpenaiKey,
        onProgress
      );
      return { visualAnalysis: result, provider: "gpt-5-mini" };
    } catch (error) {
      const msg = (error as Error).message;
      errors.push(`GPT-5 mini (user): ${msg.slice(0, 100)}`);
      console.error("GPT-5 mini (user key) failed:", error);
    }
  }

  // Try 3: Claude Haiku with env key
  if (keys.envAnthropicKey) {
    try {
      onProgress?.(65, "Trying Claude 4.5 Haiku (system key)...");
      const result = await analyzeFramesWithClaude(
        framePaths,
        transcription,
        keys.envAnthropicKey,
        onProgress
      );
      return { visualAnalysis: result, provider: "claude-haiku-env" };
    } catch (error) {
      const msg = (error as Error).message;
      errors.push(`Claude Haiku (env): ${msg.slice(0, 100)}`);
      console.error("Claude Haiku (env key) failed:", error);
    }
  }

  // All attempts failed
  throw new Error(
    "Visual analysis failed with all available providers:\n" +
    errors.map((e) => `  - ${e}`).join("\n") +
    "\n\nPlease check your API keys in Settings."
  );
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeAudioWithWhisper(
  audioPath: string,
  apiKey: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{ text: string; segments?: TranscriptionSegment[] }> {
  const client = new OpenAI({ apiKey });

  onProgress?.(45, "Sending audio to Whisper...");

  const audioFile = fs.createReadStream(audioPath);

  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    response_format: "verbose_json",
  });

  onProgress?.(55, "Audio transcription complete");

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
 * Analyze video frames with Claude Haiku
 */
async function analyzeFramesWithClaude(
  framePaths: string[],
  transcription: string,
  apiKey: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const client = new Anthropic({ apiKey });

  onProgress?.(70, "Reading frames for analysis...");

  // Sample frames (max 60 for ~5 sec intervals on a 5-min video)
  const frames = await readFramesAsBase64(framePaths, 60);

  onProgress?.(75, `Analyzing ${frames.length} frames with Claude 4.5 Haiku...`);

  // Build content array with frames
  const content: Anthropic.Messages.ContentBlockParam[] = [];

  // Add frames as images
  for (const frame of frames) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: frame.base64,
      },
    });
  }

  // Add the analysis prompt with transcription context
  content.push({
    type: "text",
    text: `These are frames extracted from a video at 1 frame per second. The audio transcription is:

---
${transcription}
---

Please analyze the visual content and provide:
1. A description of what's shown on screen throughout the video
2. Any UI elements, code, diagrams, or text visible on screen
3. How the visual content relates to what's being said

Focus on visual elements that add context beyond what's in the transcription.`,
  });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  onProgress?.(90, "Visual analysis complete");

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

/**
 * Analyze video frames with GPT-5 mini
 */
async function analyzeFramesWithOpenAI(
  framePaths: string[],
  transcription: string,
  apiKey: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const client = new OpenAI({ apiKey });

  onProgress?.(70, "Reading frames for analysis...");

  // Sample frames (max 60 for ~5 sec intervals on a 5-min video)
  const frames = await readFramesAsBase64(framePaths, 60);

  onProgress?.(75, `Analyzing ${frames.length} frames with GPT-5 mini...`);

  // Build content array with frames
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  // Add frames as images
  for (const frame of frames) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${frame.base64}`,
        detail: "high", // High detail to read UI text and code
      },
    });
  }

  // Add the analysis prompt with transcription context
  content.push({
    type: "text",
    text: `These are frames extracted from a video at 1 frame per second. The audio transcription is:

---
${transcription}
---

Please analyze the visual content and provide:
1. A description of what's shown on screen throughout the video
2. Any UI elements, code, diagrams, or text visible on screen
3. How the visual content relates to what's being said

Focus on visual elements that add context beyond what's in the transcription.`,
  });

  const response = await client.chat.completions.create({
    model: "gpt-5-mini",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  onProgress?.(90, "Visual analysis complete");

  return response.choices[0]?.message?.content ?? "";
}

/**
 * Get estimated transcription time based on file size
 * Returns estimate in seconds
 */
export function estimateTranscriptionTime(fileSizeBytes: number): number {
  // Rough estimate: 1MB takes about 5-8 seconds with preprocessing
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  return Math.ceil(fileSizeMB * 6);
}
