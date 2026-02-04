import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

export interface PreprocessedVideo {
  /** Directory containing all preprocessed assets */
  outputDir: string;
  /** Paths to extracted frame images */
  frames: string[];
  /** Path to extracted audio file */
  audioPath: string;
  /** Video duration in seconds */
  duration: number;
  /** Frames per second used for extraction */
  fps: number;
}

export interface PreprocessingOptions {
  /** Frames per second to extract (default: 1) */
  fps?: number;
  /** Audio format (default: mp3) */
  audioFormat?: "mp3" | "wav";
  /** Max frames to extract (default: 300 = 5 min video at 1fps) */
  maxFrames?: number;
  /** Progress callback */
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Check if ffmpeg is available on the system
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"]);
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);

    let output = "";
    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(parseFloat(output.trim()) || 0);
      } else {
        reject(new Error(`ffprobe exited with code ${code}`));
      }
    });
  });
}

/**
 * Extract frames from video at specified FPS
 */
async function extractFrames(
  videoPath: string,
  outputDir: string,
  fps: number,
  maxFrames: number,
  onProgress?: (progress: number, message: string) => void
): Promise<string[]> {
  const framesDir = path.join(outputDir, "frames");
  await fs.promises.mkdir(framesDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const outputPattern = path.join(framesDir, "frame_%04d.jpg");

    // Use fps filter and limit frames
    const proc = spawn("ffmpeg", [
      "-i", videoPath,
      "-vf", `fps=${fps}`,
      "-frames:v", maxFrames.toString(),
      "-q:v", "2", // High quality JPEG
      "-y", // Overwrite
      outputPattern,
    ]);

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      // Parse progress from ffmpeg output if needed
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", async (code) => {
      if (code === 0) {
        // Read extracted frames
        const files = await fs.promises.readdir(framesDir);
        const frames = files
          .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
          .sort()
          .map((f) => path.join(framesDir, f));

        onProgress?.(50, `Extracted ${frames.length} frames`);
        resolve(frames);
      } else {
        reject(new Error(`ffmpeg frame extraction failed: ${stderr.slice(-500)}`));
      }
    });
  });
}

/**
 * Extract audio track from video
 */
async function extractAudio(
  videoPath: string,
  outputDir: string,
  format: "mp3" | "wav",
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const audioPath = path.join(outputDir, `audio.${format}`);

  return new Promise((resolve, reject) => {
    const args = [
      "-i", videoPath,
      "-vn", // No video
      "-acodec", format === "mp3" ? "libmp3lame" : "pcm_s16le",
      "-ar", "16000", // 16kHz sample rate (good for speech)
      "-ac", "1", // Mono
      "-y", // Overwrite
      audioPath,
    ];

    const proc = spawn("ffmpeg", args);

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(70, "Audio extracted");
        resolve(audioPath);
      } else {
        reject(new Error(`ffmpeg audio extraction failed: ${stderr.slice(-500)}`));
      }
    });
  });
}

/**
 * Preprocess a video file: extract frames and audio
 */
export async function preprocessVideo(
  videoPath: string,
  options: PreprocessingOptions = {}
): Promise<PreprocessedVideo> {
  const {
    fps = 1,
    audioFormat = "mp3",
    maxFrames = 300,
    onProgress,
  } = options;

  // Check ffmpeg availability
  const ffmpegAvailable = await checkFfmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error(
      "ffmpeg is not installed. Please install ffmpeg to process videos. " +
      "On macOS: brew install ffmpeg, On Ubuntu: apt install ffmpeg"
    );
  }

  onProgress?.(5, "Starting video preprocessing...");

  // Create output directory
  const outputDir = path.join(path.dirname(videoPath), `preprocessed_${uuid()}`);
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    // Get video duration
    onProgress?.(10, "Analyzing video...");
    const duration = await getVideoDuration(videoPath);

    // Extract frames
    onProgress?.(20, "Extracting frames...");
    const frames = await extractFrames(videoPath, outputDir, fps, maxFrames, onProgress);

    // Extract audio
    onProgress?.(60, "Extracting audio...");
    const audioPath = await extractAudio(videoPath, outputDir, audioFormat, onProgress);

    onProgress?.(100, "Preprocessing complete");

    return {
      outputDir,
      frames,
      audioPath,
      duration,
      fps,
    };
  } catch (error) {
    // Cleanup on failure
    try {
      await fs.promises.rm(outputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Clean up preprocessed video assets
 */
export async function cleanupPreprocessedVideo(preprocessed: PreprocessedVideo): Promise<void> {
  try {
    await fs.promises.rm(preprocessed.outputDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Read frames as base64 for sending to vision APIs
 * Optionally sample frames to reduce token usage
 */
export async function readFramesAsBase64(
  frames: string[],
  maxFrames: number = 30
): Promise<Array<{ base64: string; timestamp: number }>> {
  // Sample frames evenly if we have too many
  let selectedFrames = frames;
  if (frames.length > maxFrames) {
    const step = Math.ceil(frames.length / maxFrames);
    selectedFrames = frames.filter((_, i) => i % step === 0).slice(0, maxFrames);
  }

  const result: Array<{ base64: string; timestamp: number }> = [];

  for (let i = 0; i < selectedFrames.length; i++) {
    const framePath = selectedFrames[i];
    const buffer = await fs.promises.readFile(framePath);
    const base64 = buffer.toString("base64");

    // Extract frame number from filename (frame_0001.jpg -> 0)
    const match = path.basename(framePath).match(/frame_(\d+)\.jpg/);
    const frameNum = match ? parseInt(match[1], 10) - 1 : i;

    result.push({
      base64,
      timestamp: frameNum, // At 1fps, frame number = second
    });
  }

  return result;
}
