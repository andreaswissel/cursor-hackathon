import { v4 as uuid } from "uuid";
import { sessionStore, AgentType, VideoMetadata } from "../lib/session-store";
import { transcribeVideo, TranscriptionResult } from "../lib/video-transcription";
import { DocumentationAgent, DocumentationPieceOutput } from "./documentation-agent";
import { LLMConfig, getUserLLMConfig } from "../lib/llm";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { getUploadPath } from "../lib/upload";

export interface DocOrchestratorInput {
  sessionId: string;
  userId: string;
  description: string;
  videoMetadata: VideoMetadata;
}

export interface DocOrchestratorResult {
  success: boolean;
  transcription?: TranscriptionResult;
  pieces?: DocumentationPieceOutput[];
  error?: string;
}

export class DocOrchestratorAgent {
  type: AgentType = "doc-orchestrator";
  private id: string = uuid();
  private sessionId: string = "";
  private documentationAgent = new DocumentationAgent();

  private async log(content: string): Promise<void> {
    await sessionStore.appendLog(this.sessionId, this.type, content);
  }

  private async getLLMConfig(userId: string): Promise<{ config: LLMConfig; openaiApiKey?: string; geminiApiKey?: string }> {
    const [user] = await db
      .select({
        activeProvider: users.activeProvider,
        anthropicApiKey: users.anthropicApiKey,
        openaiApiKey: users.openaiApiKey,
        geminiApiKey: users.geminiApiKey,
      })
      .from(users)
      .where(eq(users.id, userId));

    return {
      config: getUserLLMConfig(user || {}),
      openaiApiKey: user?.openaiApiKey || undefined,
      geminiApiKey: user?.geminiApiKey || undefined,
    };
  }

  async run(input: DocOrchestratorInput): Promise<DocOrchestratorResult> {
    const { sessionId, userId, description, videoMetadata } = input;
    this.sessionId = sessionId;

    // Initialize orchestrator
    await sessionStore.initAgent(sessionId, this.type, this.id);
    await sessionStore.setAgentStatus(sessionId, this.type, "running");
    await sessionStore.setSessionStatus(sessionId, "running");

    await this.log("Starting Documentation workflow...\n");
    await this.log(`Video: ${videoMetadata.originalName} (${(videoMetadata.size / 1024 / 1024).toFixed(1)} MB)\n\n`);

    // Get user's LLM configuration
    const { config: llmConfig, openaiApiKey, geminiApiKey } = await this.getLLMConfig(userId);

    // Phase 1: Transcription
    await this.log("Phase 1: Transcribing video...\n");
    await sessionStore.initAgent(sessionId, "transcription", uuid());
    await sessionStore.setAgentStatus(sessionId, "transcription", "running");

    let transcription: TranscriptionResult;
    try {
      const videoPath = getUploadPath(videoMetadata.filename);

      transcription = await transcribeVideo(videoPath, llmConfig, {
        onProgress: (progress, message) => {
          sessionStore.appendLog(sessionId, "transcription", `[${progress}%] ${message}\n`);
        },
      }, { openaiApiKey, geminiApiKey });

      await sessionStore.setAgentOutput(sessionId, "transcription", {
        text: transcription.text.substring(0, 500) + "...", // Truncate for output display
        hasSegments: !!transcription.segments,
        segmentCount: transcription.segments?.length || 0,
      });
      await sessionStore.setAgentStatus(sessionId, "transcription", "completed");
      await this.log(`\n✓ Transcription complete (${transcription.text.length} characters)\n\n`);
    } catch (error) {
      const errorMessage = (error as Error).message;
      await sessionStore.setAgentStatus(sessionId, "transcription", "failed");
      await this.log(`\n✗ Transcription failed: ${errorMessage}\n`);
      await sessionStore.setAgentStatus(sessionId, this.type, "failed");
      await sessionStore.setSessionStatus(sessionId, "failed");
      return { success: false, error: `Transcription failed: ${errorMessage}` };
    }

    // Phase 2: Documentation Generation
    await this.log("Phase 2: Generating documentation pieces...\n");

    const docResult = await this.documentationAgent.run(
      {
        sessionId,
        transcription: transcription.text,
        description,
        segments: transcription.segments,
      },
      llmConfig
    );

    if (!docResult.success) {
      await sessionStore.setAgentStatus(sessionId, this.type, "failed");
      await sessionStore.setSessionStatus(sessionId, "failed");
      return { success: false, transcription, error: docResult.error };
    }

    // Phase 3: Save documentation pieces to database
    await this.log("\nPhase 3: Saving documentation pieces...\n");

    for (let i = 0; i < docResult.pieces.length; i++) {
      const piece = docResult.pieces[i];
      await sessionStore.addDocumentationPiece(sessionId, {
        pieceType: piece.pieceType,
        title: piece.title,
        content: piece.content,
        status: "pending",
        order: i,
        startTimestamp: piece.startTimestamp ?? null,
        endTimestamp: piece.endTimestamp ?? null,
        refinementHistory: [],
      });
      await this.log(`  ✓ Saved: ${piece.title} (${piece.pieceType})\n`);
    }

    await this.log(`\n✅ Documentation workflow complete! Generated ${docResult.pieces.length} pieces.\n`);
    await sessionStore.setAgentStatus(sessionId, this.type, "completed");
    await sessionStore.setSessionStatus(sessionId, "completed");

    return {
      success: true,
      transcription,
      pieces: docResult.pieces,
    };
  }
}
