import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { sessionStore, SessionContext, SessionEvents, AgentType, DocPieceStatus, VideoMetadata } from "../lib/session-store";
import { OrchestratorAgent } from "../agents/orchestrator-agent";
import { DocOrchestratorAgent } from "../agents/doc-orchestrator-agent";
import { streamCompletion, getUserLLMConfig } from "../lib/claude";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { users, sessions as sessionsTable, projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import {
  checkSessionLimit,
  checkPromptLimit,
  checkSessionOwnership,
  incrementPromptCount,
  getUserUsageStats,
  getSessionUsageStats,
} from "../middleware/rate-limit";
import { videoUpload, deleteUploadedFile } from "../lib/upload";
import { ensureDefaultProject } from "../lib/project-helpers";
import { CodeAgent } from "../agents/code-agent";
import { ReviewAgent } from "../agents/review-agent";
import { ChangelogAgent } from "../agents/changelog-agent";
import { DiscoveryAgent, StrategyAgent, SpecAgent, GTMAgent } from "../agents";
import { ProductMarketingAgent } from "../agents/product-marketing-agent";
import { GuidedToursAgent } from "../agents/guided-tours-agent";
import { FeedbackFormsAgent } from "../agents/feedback-forms-agent";
import { resolveKnowledge, toSessionContext } from "../lib/knowledge-resolver";
import { knowledgeSources } from "../db/schema";
import type { AgentInput } from "../agents/base-agent";

// Agent prefix map for flow mode triggers
const AGENT_PREFIX_MAP: Record<string, { agentType: AgentType; requiresRepo: boolean; label: string }> = {
  "@Code":      { agentType: "code-agent",        requiresRepo: true,  label: "Code" },
  "@Review":    { agentType: "review-agent",       requiresRepo: true,  label: "Review" },
  "@Discovery": { agentType: "discovery",          requiresRepo: false, label: "Discovery" },
  "@Strategy":  { agentType: "strategy",           requiresRepo: false, label: "Strategy" },
  "@Spec":      { agentType: "spec",               requiresRepo: false, label: "Spec" },
  "@GTM":       { agentType: "gtm",                requiresRepo: false, label: "GTM" },
  "@Marketing": { agentType: "product-marketing",  requiresRepo: false, label: "Marketing" },
  "@Changelog": { agentType: "changelog-agent",    requiresRepo: false, label: "Changelog" },
};

// Generate a short title from the user's first message using Haiku
async function generateSessionTitle(message: string, userApiKey?: string): Promise<string> {
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return message.slice(0, 60);
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      system: "Generate a concise 3-6 word title for a product chat session based on the user's message. Output ONLY the title, no quotes or punctuation at the end.",
      messages: [{ role: "user", content: message }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const title = textBlock?.text?.trim();
    if (title && title.length > 0 && title.length <= 80) return title;
    return message.slice(0, 60);
  } catch {
    return message.slice(0, 60);
  }
}

const router = Router();

// All session routes require authentication
router.use(requireAuth);

// Get user's usage stats
router.get("/usage", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.isAdmin;
  const stats = await getUserUsageStats(userId, isAdmin);
  res.json(stats);
});

// Get all sessions (for sidebar) - filtered by user
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const sessions = await sessionStore.getAllForUser(userId);
  res.json({ sessions: sessions.map((s) => ({ ...s, projectId: s.projectId })) });
});

// Create a new session
router.post("/", checkSessionLimit, async (req: Request, res: Response) => {
  const { idea, context, projectId } = req.body as {
    idea: string;
    context?: SessionContext;
    projectId?: string;
  };

  if (!idea) {
    res.status(400).json({ error: "Missing idea" });
    return;
  }

  const userId = req.user!.id;
  const resolvedProjectId = projectId || await ensureDefaultProject(userId);

  // If no context provided, try to auto-resolve from project knowledge
  let resolvedContext: SessionContext;
  if (context) {
    resolvedContext = context;
  } else {
    // Check if project has knowledge sources
    const sources = await db
      .select({ id: knowledgeSources.id })
      .from(knowledgeSources)
      .where(eq(knowledgeSources.projectId, resolvedProjectId));

    if (sources.length > 0) {
      const knowledgeItems = await resolveKnowledge(resolvedProjectId, userId);
      const aiSummaries = (await db
        .select({ name: knowledgeSources.name, aiSummary: knowledgeSources.aiSummary })
        .from(knowledgeSources)
        .where(eq(knowledgeSources.projectId, resolvedProjectId)))
        .filter(s => s.aiSummary)
        .map(s => ({ name: s.name, summary: s.aiSummary! }));

      resolvedContext = toSessionContext(knowledgeItems, aiSummaries);
    } else {
      resolvedContext = { okrs: [], customerFeedback: [] };
    }
  }

  const sessionId = uuid();
  await sessionStore.create(sessionId, idea, resolvedContext, userId, "idea-to-spec", undefined, resolvedProjectId);

  // Start orchestrator in background (pass userId for slides generation)
  const orchestrator = new OrchestratorAgent();
  orchestrator.run({ sessionId, userId, idea, context: resolvedContext }).catch((error) => {
    console.error("Orchestrator error:", error);
    sessionStore.setSessionStatus(sessionId, "failed");
  });

  res.json({ sessionId });
});

// Create a new documentation session (with video upload)
router.post(
  "/documentation",
  checkSessionLimit,
  videoUpload.single("video"),
  async (req: Request, res: Response) => {
    const { description, projectId } = req.body;
    const videoFile = req.file;

    if (!description) {
      if (videoFile) {
        await deleteUploadedFile(videoFile.filename);
      }
      res.status(400).json({ error: "Missing description" });
      return;
    }

    if (!videoFile) {
      res.status(400).json({ error: "Missing video file" });
      return;
    }

    const userId = req.user!.id;
    const sessionId = uuid();
    const resolvedProjectId = projectId || await ensureDefaultProject(userId);

    // Create video metadata
    const videoMetadata: VideoMetadata = {
      filename: videoFile.filename,
      originalName: videoFile.originalname,
      mimeType: videoFile.mimetype,
      size: videoFile.size,
      path: videoFile.path,
    };

    // Empty context for documentation mode
    const context: SessionContext = {
      okrs: [],
      customerFeedback: [],
    };

    await sessionStore.create(sessionId, description, context, userId, "documentation", videoMetadata, resolvedProjectId);

    // Start doc orchestrator in background
    const docOrchestrator = new DocOrchestratorAgent();
    docOrchestrator
      .run({
        sessionId,
        userId,
        description,
        videoMetadata,
      })
      .catch((error) => {
        console.error("Doc orchestrator error:", error);
        sessionStore.setSessionStatus(sessionId, "failed");
      });

    res.json({ sessionId });
  }
);

// Create a new flow session
router.post("/flow", checkSessionLimit, async (req: Request, res: Response) => {
  const { message, title, projectId, repoUrl } = req.body as {
    message?: string;
    title?: string;
    projectId?: string;
    repoUrl?: string;
  };

  // Support both new (message) and legacy (title) field
  const userMessage = message || title;
  if (!userMessage) {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const userId = req.user!.id;
  const resolvedProjectId = projectId || await ensureDefaultProject(userId);

  // Look up user's API key for title generation
  const [userRow] = await db.select({ anthropicApiKey: users.anthropicApiKey }).from(users).where(eq(users.id, userId));
  const generatedTitle = message ? await generateSessionTitle(message, userRow?.anthropicApiKey || undefined) : userMessage;

  // Fall back to project's repoUrl if none provided
  let resolvedRepoUrl = repoUrl;
  if (!resolvedRepoUrl) {
    const [project] = await db
      .select({ repoUrl: projects.repoUrl })
      .from(projects)
      .where(eq(projects.id, resolvedProjectId));
    if (project?.repoUrl) resolvedRepoUrl = project.repoUrl;
  }

  const sessionId = uuid();
  const context: SessionContext = { okrs: [], customerFeedback: [] };

  await sessionStore.create(sessionId, generatedTitle, context, userId, "flow", undefined, resolvedProjectId, resolvedRepoUrl);
  // Flow sessions are immediately ready for chat — set status to completed
  await sessionStore.setSessionStatus(sessionId, "completed");

  res.json({ sessionId, title: generatedTitle });
});

// Create a new guided tours session
router.post("/guided-tours", checkSessionLimit, async (req: Request, res: Response) => {
  const { message, sessionLink, projectId } = req.body as {
    message?: string;
    sessionLink?: string;
    projectId?: string;
  };

  if (!message) {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const userId = req.user!.id;
  const resolvedProjectId = projectId || await ensureDefaultProject(userId);
  const [gtUser] = await db.select({ anthropicApiKey: users.anthropicApiKey }).from(users).where(eq(users.id, userId));
  const generatedTitle = await generateSessionTitle(message, gtUser?.anthropicApiKey || undefined);

  const sessionId = uuid();
  const context: SessionContext = { okrs: [], customerFeedback: [] };

  await sessionStore.create(sessionId, generatedTitle, context, userId, "guided-tours", undefined, resolvedProjectId);
  await sessionStore.setSessionStatus(sessionId, "completed");

  res.json({ sessionId, title: generatedTitle });
});

// Create a new feedback forms session
router.post("/feedback-forms", checkSessionLimit, async (req: Request, res: Response) => {
  const { message, projectId } = req.body as {
    message?: string;
    projectId?: string;
  };

  if (!message) {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const userId = req.user!.id;
  const resolvedProjectId = projectId || await ensureDefaultProject(userId);
  const [ffUser] = await db.select({ anthropicApiKey: users.anthropicApiKey }).from(users).where(eq(users.id, userId));
  const generatedTitle = await generateSessionTitle(message, ffUser?.anthropicApiKey || undefined);

  const sessionId = uuid();
  const context: SessionContext = { okrs: [], customerFeedback: [] };

  await sessionStore.create(sessionId, generatedTitle, context, userId, "feedback-forms", undefined, resolvedProjectId);
  await sessionStore.setSessionStatus(sessionId, "completed");

  res.json({ sessionId, title: generatedTitle });
});

// Get documentation pieces for a session
router.get("/:sessionId/documentation-pieces", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.mode !== "documentation") {
    res.status(400).json({ error: "Not a documentation session" });
    return;
  }

  const pieces = await sessionStore.getDocumentationPieces(sessionId);
  res.json({ pieces });
});

// Update documentation piece status
router.patch(
  "/:sessionId/documentation-pieces/:pieceId",
  checkSessionOwnership,
  async (req: Request, res: Response) => {
    const { sessionId, pieceId } = req.params;
    const { status } = req.body as { status: DocPieceStatus };

    if (!status || !["pending", "accepted", "declined", "refined"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.mode !== "documentation") {
      res.status(400).json({ error: "Not a documentation session" });
      return;
    }

    const updated = await sessionStore.updateDocumentationPieceStatus(sessionId, pieceId, status);
    if (!updated) {
      res.status(404).json({ error: "Documentation piece not found" });
      return;
    }

    res.json({ piece: updated });
  }
);

// Refine documentation piece (streaming SSE response)
router.post(
  "/:sessionId/documentation-pieces/:pieceId/refine",
  checkSessionOwnership,
  checkPromptLimit,
  async (req: Request, res: Response) => {
    const { sessionId, pieceId } = req.params;
    const { message } = req.body as { message: string };
    const userId = req.user!.id;

    if (!message) {
      res.status(400).json({ error: "Missing message" });
      return;
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.mode !== "documentation") {
      res.status(400).json({ error: "Not a documentation session" });
      return;
    }

    const piece = await sessionStore.getDocumentationPiece(sessionId, pieceId);
    if (!piece) {
      res.status(404).json({ error: "Documentation piece not found" });
      return;
    }

    // Get user's LLM config
    const [user] = await db
      .select({
        activeProvider: users.activeProvider,
        anthropicApiKey: users.anthropicApiKey,
        openaiApiKey: users.openaiApiKey,
        geminiApiKey: users.geminiApiKey,
      })
      .from(users)
      .where(eq(users.id, userId));

    const llmConfig = getUserLLMConfig(user || {});

    // Set up SSE for streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const systemPrompt = `You are a documentation refinement assistant. You help users improve and refine documentation pieces based on their feedback.

The user will provide feedback about how they want the documentation changed. Apply their changes while maintaining:
- Professional technical writing style
- Clear structure with headings and sections
- Proper Markdown formatting
- Accuracy and completeness

Output ONLY the refined documentation content. Do not include any explanation or preamble - just the updated documentation.`;

    const messages = [
      {
        role: "user" as const,
        content: `## Current Documentation

**Title:** ${piece.title}
**Type:** ${piece.pieceType}

**Content:**
${piece.content}

## User's Requested Changes
${message}

Please refine the documentation based on the user's feedback. Output only the updated documentation content.`,
      },
    ];

    try {
      let fullResponse = "";

      await streamCompletion(
        systemPrompt,
        messages,
        {
          onText: (text) => {
            fullResponse += text;
            res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
          },
          onComplete: async () => {
            // Update the documentation piece with the new content
            await sessionStore.updateDocumentationPieceContent(sessionId, pieceId, fullResponse, message);
            await incrementPromptCount(sessionId);
            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
          },
          onError: (error) => {
            res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
            res.end();
          },
        },
        llmConfig
      );
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: "error", error: (error as Error).message })}\n\n`);
      res.end();
    }
  }
);

// Answer an agent question (e.g., proceed despite strategy rejection)
router.post("/:sessionId/answer", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { agentType, questionId, answer } = req.body as {
    agentType: AgentType;
    questionId: string;
    answer: string;
  };

  if (!agentType || !questionId || answer === undefined) {
    res.status(400).json({ error: "Missing agentType, questionId, or answer" });
    return;
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Verify the question exists
  const currentQuestion = sessionStore.getAgentQuestion(sessionId, agentType);
  if (!currentQuestion || currentQuestion.id !== questionId) {
    res.status(400).json({ error: "No matching question found" });
    return;
  }

  // Handle strategy rejection question
  if (questionId === "strategy-rejection-proceed" && agentType === "orchestrator") {
    const proceed = answer.toLowerCase() === "yes" || answer.toLowerCase() === "true" || answer === "proceed";

    // Resume orchestrator in background
    const orchestrator = new OrchestratorAgent();
    orchestrator.resumeFromRejection({
      sessionId,
      userId: req.user!.id,
      idea: session.idea,
      context: session.context,
    }, proceed).catch((error) => {
      console.error("Orchestrator resume error:", error);
      sessionStore.setSessionStatus(sessionId, "failed");
    });

    res.json({ success: true, proceeding: proceed });
    return;
  }

  // Unknown question type
  res.status(400).json({ error: "Unknown question type" });
});

// Get session state
router.get("/:sessionId", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const state = await sessionStore.getState(sessionId);

  if (!state) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Add usage stats
  const usageStats = await getSessionUsageStats(sessionId);
  res.json({ ...state, usage: usageStats });
});

// Delete a session
router.delete("/:sessionId", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    await sessionStore.delete(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// Update session metadata (title, project assignment)
router.patch("/:sessionId", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { title, projectId } = req.body as { title?: string; projectId?: string };

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.idea = title;
  if (projectId !== undefined) updates.projectId = projectId;

  await db
    .update(sessionsTable)
    .set(updates)
    .where(eq(sessionsTable.id, sessionId));

  // Update in-memory cache
  if (title !== undefined) session.idea = title;
  if (projectId !== undefined) session.projectId = projectId;

  res.json({ success: true });
});

// Connect a repo URL to a flow session
router.post("/:sessionId/connect-repo", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { repoUrl } = req.body as { repoUrl: string };

  if (!repoUrl || typeof repoUrl !== "string") {
    res.status(400).json({ error: "Missing or invalid repoUrl" });
    return;
  }

  // Basic URL validation
  try {
    new URL(repoUrl);
  } catch {
    res.status(400).json({ error: "Invalid URL format" });
    return;
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.mode !== "flow") {
    res.status(400).json({ error: "Can only connect repos to flow sessions" });
    return;
  }

  // Update in DB
  await db
    .update(sessionsTable)
    .set({ repoUrl, updatedAt: new Date() })
    .where(eq(sessionsTable.id, sessionId));

  // Update cache
  session.repoUrl = repoUrl;

  res.json({ success: true, repoUrl });
});

// SSE endpoint for real-time updates
router.get("/:sessionId/stream", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = await sessionStore.get(sessionId);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send initial state
  const state = await sessionStore.getState(sessionId);
  res.write(`data: ${JSON.stringify({ type: "init", payload: state })}\n\n`);

  // Subscribe to events
  const unsubscribers: Array<() => void> = [];

  const eventTypes: Array<keyof SessionEvents> = [
    "agent:init",
    "agent:log",
    "agent:status",
    "agent:question",
    "agent:output",
    "agent:message",
    "session:status",
    "session:output",
    "documentation:piece",
    "documentation:piece:updated",
    "artifact:created",
    "artifact:updated",
    "artifact:deleted",
  ];

  for (const eventType of eventTypes) {
    const unsub = sessionStore.events.on(eventType, (data) => {
      if ("sessionId" in data && data.sessionId === sessionId) {
        res.write(`data: ${JSON.stringify({ type: eventType, payload: data })}\n\n`);
      }
    });
    unsubscribers.push(unsub);
  }

  // Clean up on close
  req.on("close", () => {
    unsubscribers.forEach((unsub) => unsub());
  });
});

// Chat with an agent
router.post("/:sessionId/chat", checkSessionOwnership, checkPromptLimit, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;
  const { agentType, message } = req.body as {
    agentType: AgentType;
    message: string;
  };

  if (!agentType || !message) {
    res.status(400).json({ error: "Missing agentType or message" });
    return;
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Detect @Agent prefix in flow mode
  if (session.mode === "flow") {
    const matchedPrefix = Object.keys(AGENT_PREFIX_MAP).find((prefix) =>
      message.startsWith(prefix)
    );

    if (matchedPrefix) {
      const { agentType: targetAgentType, requiresRepo, label: agentLabel } = AGENT_PREFIX_MAP[matchedPrefix];
      const strippedMessage = message.slice(matchedPrefix.length).trim();

      if (requiresRepo && !session.repoUrl) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        await sessionStore.addMessage(sessionId, agentType, "user", message);
        const errorMsg = `Please connect a repository first before using ${matchedPrefix}. Use the repo connector above the input area to link a GitHub repository.`;
        await sessionStore.addMessage(sessionId, agentType, "assistant", errorMsg);
        res.write(`data: ${JSON.stringify({ type: "text", content: errorMsg })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
        return;
      }

      // Save user message
      await sessionStore.addMessage(sessionId, agentType, "user", message);

      // Set up SSE for streaming agent logs
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      // Send agent-thinking-start event
      res.write(`data: ${JSON.stringify({ type: "agent-thinking-start", agentType: targetAgentType, agentLabel })}\n\n`);

      // Get user's API key for BYOK
      const [userRow] = await db
        .select({ anthropicApiKey: users.anthropicApiKey })
        .from(users)
        .where(eq(users.id, userId));
      const userApiKey = userRow?.anthropicApiKey || undefined;

      // Subscribe to agent log events and stream them as thinking events
      const unsubLog = sessionStore.events.on("agent:log", (data) => {
        if (data.sessionId === sessionId && data.agentType === targetAgentType) {
          res.write(`data: ${JSON.stringify({ type: "thinking", content: data.log.content, agentType: targetAgentType })}\n\n`);
        }
      });

      const unsubStatus = sessionStore.events.on("agent:status", (data) => {
        if (data.sessionId === sessionId && data.agentType === targetAgentType) {
          if (data.status === "completed" || data.status === "failed") {
            // Send agent-thinking-end
            res.write(`data: ${JSON.stringify({ type: "agent-thinking-end", agentType: targetAgentType, status: data.status })}\n\n`);
            // Send summary message
            const summaryText = data.status === "completed"
              ? `${agentLabel} agent completed successfully.`
              : `${agentLabel} agent failed.`;
            res.write(`data: ${JSON.stringify({ type: "text", content: summaryText })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
            unsubLog();
            unsubStatus();
          }
        }
      });

      req.on("close", () => {
        unsubLog();
        unsubStatus();
      });

      // Run agent in background
      if (targetAgentType === "code-agent") {
        const codeAgent = new CodeAgent();
        codeAgent.run({
          sessionId,
          userId,
          message: strippedMessage || "Implement the requested changes",
          repoUrl: session.repoUrl!,
          apiKey: userApiKey,
        }).catch((err) => console.error("CodeAgent error:", err));
      } else if (targetAgentType === "review-agent") {
        const reviewAgent = new ReviewAgent();
        reviewAgent.run({
          sessionId,
          userId,
          message: strippedMessage || "Review the codebase for issues",
          repoUrl: session.repoUrl!,
          apiKey: userApiKey,
        }).catch((err) => console.error("ReviewAgent error:", err));
      } else if (targetAgentType === "changelog-agent") {
        // Parse $session-id references from message
        const sessionIdRefs = [...strippedMessage.matchAll(/\$([0-9a-f-]{36})/gi)].map((m) => m[1]);
        const changelogAgent = new ChangelogAgent();
        changelogAgent.run({
          sessionId,
          userId,
          message: strippedMessage || "Write a changelog based on recent work",
          referencedSessionIds: sessionIdRefs.length > 0 ? sessionIdRefs : undefined,
          apiKey: userApiKey,
        }).catch((err) => console.error("ChangelogAgent error:", err));
      } else {
        // Pipeline agents (discovery, strategy, spec, gtm, product-marketing)
        runPipelineAgentInFlowMode(
          targetAgentType,
          sessionId,
          userId,
          session,
          strippedMessage,
          agentLabel
        ).catch((err) => console.error(`${agentLabel} agent error:`, err));
      }

      return;
    }
  }

  // Get user's LLM config (for BYOK)
  const [user] = await db
    .select({
      activeProvider: users.activeProvider,
      anthropicApiKey: users.anthropicApiKey,
      openaiApiKey: users.openaiApiKey,
      geminiApiKey: users.geminiApiKey,
    })
    .from(users)
    .where(eq(users.id, userId));

  const llmConfig = getUserLLMConfig(user || {});

  // Get agent's previous output as context
  const agent = session.agents.get(agentType);
  const agentOutput = agent?.output;
  const previousMessages = await sessionStore.getMessages(sessionId, agentType);

  // Save user message
  await sessionStore.addMessage(sessionId, agentType, "user", message);

  // Build context for the agent
  const systemPrompt = buildAgentChatPrompt(agentType, session, agentOutput);

  // Build message history
  const messageHistory = previousMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  messageHistory.push({ role: "user", content: message });

  // Set up SSE for streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    let fullResponse = "";

    await streamCompletion(systemPrompt, messageHistory, {
      onText: (text) => {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
      },
      onComplete: async () => {
        // Save assistant message and increment prompt count
        await sessionStore.addMessage(sessionId, agentType, "assistant", fullResponse);
        await incrementPromptCount(sessionId);

        // For flow-like modes, parse and save any artifacts from the response
        if (session!.mode === "flow" || session!.mode === "guided-tours" || session!.mode === "feedback-forms") {
          const artifacts = parseArtifacts(fullResponse);
          for (const artifact of artifacts) {
            await sessionStore.createArtifact(sessionId, {
              type: artifact.type,
              title: artifact.title,
              content: artifact.content,
              status: "ready",
            });
          }
        }

        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      },
      onError: (error) => {
        res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
        res.end();
      },
    }, llmConfig);
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: "error", error: (error as Error).message })}\n\n`);
    res.end();
  }
});

// Get chat history for an agent
router.get("/:sessionId/chat/:agentType", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId, agentType } = req.params;

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const messages = await sessionStore.getMessages(sessionId, agentType as AgentType);
  res.json({ messages });
});

// Helper to run pipeline agents (discovery, strategy, spec, gtm, product-marketing) in flow mode
async function runPipelineAgentInFlowMode(
  targetAgentType: AgentType,
  sessionId: string,
  userId: string,
  session: NonNullable<Awaited<ReturnType<typeof sessionStore.get>>>,
  userMessage: string,
  agentLabel: string
): Promise<void> {
  // Build context from session + recent chat messages
  const recentMessages = await sessionStore.getMessages(sessionId, "flow-orchestrator");
  const last10 = recentMessages.slice(-10);
  const chatContext = last10.map((m) => `${m.role}: ${m.content}`).join("\n\n");

  // Gather previous outputs from existing agents on this session
  const previousOutputs: Record<string, unknown> = {};
  for (const [aType, aState] of session.agents.entries()) {
    if (aState.output) {
      previousOutputs[aType] = aState.output;
    }
  }

  const agentInput: AgentInput = {
    sessionId,
    idea: userMessage || session.idea,
    context: {
      ...session.context,
      additionalDocs: chatContext
        ? `## Recent Flow Chat Context\n\n${chatContext}`
        : session.context.additionalDocs,
    },
    previousOutputs,
  };

  // Create the appropriate agent instance
  const agentMap: Partial<Record<AgentType, () => InstanceType<any>>> = {
    discovery: () => new DiscoveryAgent(),
    strategy: () => new StrategyAgent(),
    spec: () => new SpecAgent(),
    gtm: () => new GTMAgent(),
    "product-marketing": () => new ProductMarketingAgent(),
  };

  const createAgent = agentMap[targetAgentType];
  if (!createAgent) {
    throw new Error(`Unknown pipeline agent type: ${targetAgentType}`);
  }

  const agent = createAgent();
  const result = await agent.run(agentInput);

  // On success, create an artifact from the output
  if (result.success && result.output) {
    const artifactTypeMap: Partial<Record<AgentType, string>> = {
      discovery: "discovery",
      strategy: "strategy",
      spec: "spec",
      gtm: "gtm",
      "product-marketing": "product-marketing",
    };

    const artifactType = artifactTypeMap[targetAgentType] || "document";
    const content = typeof result.output === "string"
      ? result.output
      : JSON.stringify(result.output, null, 2);

    await sessionStore.createArtifact(sessionId, {
      type: artifactType,
      title: `${agentLabel} Output`,
      content,
      status: "ready",
    });
  }

  // Save summary assistant message
  const summaryContent = result.success
    ? `${agentLabel} agent completed. Check the artifact panel for results.`
    : `${agentLabel} agent failed.`;
  await sessionStore.addMessage(sessionId, "flow-orchestrator", "assistant", summaryContent);
}

// Helper to build chat prompt for each agent type
function buildAgentChatPrompt(
  agentType: AgentType,
  session: Awaited<ReturnType<typeof sessionStore.get>>,
  previousOutput: unknown
): string {
  const baseContext = `You are continuing a conversation about a product idea.

## Product Idea
${session?.idea}

## Company Context
OKRs: ${JSON.stringify(session?.context.okrs)}
Customer Feedback: ${JSON.stringify(session?.context.customerFeedback)}
`;

  const agentContexts: Partial<Record<AgentType, string>> = {
    orchestrator: `You are the Orchestrator Agent. You coordinate the overall product development workflow.
You have access to outputs from all other agents and can help the user understand the big picture,
make changes to the overall strategy, or decide next steps.

${baseContext}

Your job is to:
- Answer questions about the overall product direction
- Help coordinate changes across multiple areas
- Suggest when to re-run specific agents
- Provide holistic guidance on the product`,

    discovery: `You are the Discovery Agent. You specialize in validating product ideas against customer feedback.

${baseContext}

${previousOutput ? `## Your Previous Analysis\n${JSON.stringify(previousOutput)}\n` : ""}

Your job is to:
- Answer questions about customer pain points
- Refine the problem validation
- Discuss market signals
- Help prioritize which problems to solve`,

    strategy: `You are the Strategy Agent. You specialize in OKR alignment and strategic prioritization.

${baseContext}

${previousOutput ? `## Your Previous Analysis\n${JSON.stringify(previousOutput)}\n` : ""}

Your job is to:
- Answer questions about strategic fit
- Discuss priority trade-offs
- Refine OKR alignment
- Help with resource allocation decisions`,

    spec: `You are the Spec Writer Agent. You specialize in creating detailed feature specifications.

${baseContext}

${previousOutput ? `## Your Previous Spec\n${JSON.stringify(previousOutput)}\n` : ""}

Your job is to:
- Answer questions about the specification
- Refine requirements
- Add or modify acceptance criteria
- Help clarify technical considerations`,

    gtm: `You are the GTM (Go-To-Market) Agent. You specialize in launch communications and marketing.

${baseContext}

${previousOutput ? `## Your Previous Output\n${JSON.stringify(previousOutput)}\n` : ""}

Your job is to:
- Answer questions about messaging
- Refine launch materials
- Discuss positioning
- Help with communication strategy`,

    "product-marketing": `You are the Product Marketing Agent. You specialize in internal product communications.

${baseContext}

${previousOutput ? `## Your Previous Output\n${JSON.stringify(previousOutput)}\n` : ""}

Your job is to:
- Answer questions about the internal product update
- Refine the announcement for Teams/Slack
- Help clarify the message for different audiences
- Suggest improvements to make the update more engaging`,

    "flow-orchestrator": `You are a senior product engineering assistant in Flow Mode. You help users build, plan, and ship product features through continuous conversation.

${baseContext}

You can create artifacts during your responses using this format:
[ARTIFACT:type:title]
content here
[/ARTIFACT]

Artifact types: plan, code-diff, review, spec, document, pr-link

When the user asks you to:
- Plan something → create a "plan" artifact with structured steps
- Write code → create a "code-diff" artifact with the code
- Review something → create a "review" artifact with findings
- Write a spec → create a "spec" artifact
- Write documentation → create a "document" artifact

When a user mentions @Code or @Review, acknowledge the agent trigger.
Keep your chat responses conversational and concise. Use artifacts for substantial content.`,

    "code-agent": `You are a Code Agent. You help implement features by writing code.

${baseContext}

Your job is to:
- Write clean, well-structured code
- Follow existing code patterns
- Create implementation plans when asked`,

    "review-agent": `You are a Review Agent. You review code and provide feedback.

${baseContext}

Your job is to:
- Review code for bugs, performance, and best practices
- Suggest improvements
- Identify potential issues`,

    "changelog-agent": `You are a Changelog Agent. You write clear, user-facing changelog entries.

${baseContext}

${previousOutput ? `## Your Previous Output\n${JSON.stringify(previousOutput)}\n` : ""}

Your job is to:
- Write clear, concise changelog entries
- Organize into Added/Changed/Fixed/Removed categories
- Use non-technical language end users can understand
- Focus on user impact, not implementation details`,

    "guided-tours-agent": `You are a Guided Tour Design Specialist. You help product teams design step-by-step interactive product tours that onboard new users and highlight key features.

${baseContext}

You can create artifacts during your responses using this format:
[ARTIFACT:guided-tour:Tour Title]
content here
[/ARTIFACT]

Your job is to:
- Ask clarifying questions about the product, target audience, and goals
- Design a structured tour with numbered steps, each containing: target element, tooltip text, and action
- Consider user experience principles: progressive disclosure, clear CTAs, and escape hatches
- Output tours in a structured markdown format that can be translated to code
- Suggest A/B testing variations for tour effectiveness
Keep your chat responses conversational and concise. Use artifacts for substantial tour content.`,

    "feedback-forms-agent": `You are a Feedback Form Design Specialist. You help product teams create targeted feedback forms that capture user sentiment, feature requests, and usability insights.

${baseContext}

You can create artifacts during your responses using this format:
[ARTIFACT:feedback-form:Form Title]
content here
[/ARTIFACT]

Your job is to:
- Ask about the target audience, goals, and what decisions the feedback will inform
- Design forms with a mix of quantitative (NPS, ratings, scales) and qualitative (open-ended) questions
- Follow survey design best practices: avoid leading questions, keep it short, logical flow
- Output forms in a structured markdown format with question types clearly labeled
- Suggest follow-up strategies and analysis approaches
Keep your chat responses conversational and concise. Use artifacts for substantial form content.`,
  };

  // For tool modes, use the specialized prompt even when agentType is flow-orchestrator
  if (agentType === "flow-orchestrator" && session?.mode === "guided-tours") {
    return agentContexts["guided-tours-agent"]!;
  }
  if (agentType === "flow-orchestrator" && session?.mode === "feedback-forms") {
    return agentContexts["feedback-forms-agent"]!;
  }

  return agentContexts[agentType] || agentContexts["flow-orchestrator"];
}

// Parse artifacts from assistant response text
function parseArtifacts(text: string): Array<{ type: string; title: string; content: string }> {
  const artifacts: Array<{ type: string; title: string; content: string }> = [];
  const regex = /\[ARTIFACT:(\w[\w-]*):([^\]]+)\]\n?([\s\S]*?)\[\/ARTIFACT\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    artifacts.push({
      type: match[1],
      title: match[2].trim(),
      content: match[3].trim(),
    });
  }
  return artifacts;
}

export default router;
