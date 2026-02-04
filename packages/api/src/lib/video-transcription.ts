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

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  visualContext?: string;
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
 * This approach works with any video size and provides both audio and visual context.
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

    // Get API keys
    const openaiKey = config.provider === "openai" ? config.apiKey : fallbackKeys?.openaiApiKey;
    const anthropicKey = config.provider === "anthropic" ? config.apiKey : fallbackKeys?.anthropicApiKey;

    if (!openaiKey) {
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
      openaiKey,
      onProgress
    );

    onProgress?.(60, "Analyzing video frames with visual context...");

    // Step 3: Analyze frames with vision model
    let visualAnalysis: string | undefined;

    if (anthropicKey) {
      // Use Claude Haiku for visual analysis
      visualAnalysis = await analyzeFramesWithClaude(
        preprocessed.frames,
        audioTranscription.text,
        anthropicKey,
        onProgress
      );
    } else if (openaiKey) {
      // Fall back to GPT-5 mini for visual analysis
      visualAnalysis = await analyzeFramesWithOpenAI(
        preprocessed.frames,
        audioTranscription.text,
        openaiKey,
        onProgress
      );
    }

    onProgress?.(95, "Finalizing transcription...");

    // Combine results
    const result: TranscriptionResult = {
      text: audioTranscription.text,
      segments: audioTranscription.segments,
      visualContext: visualAnalysis,
    };

    onProgress?.(100, "Transcription complete");
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

  onProgress?.(65, "Reading frames for analysis...");

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

  onProgress?.(65, "Reading frames for analysis...");

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
