import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { sessionStore, SessionContext, SessionEvents, AgentType, DocPieceStatus, VideoMetadata } from "../lib/session-store";
import { OrchestratorAgent } from "../agents/orchestrator-agent";
import { DocOrchestratorAgent } from "../agents/doc-orchestrator-agent";
import { streamCompletion, getUserLLMConfig } from "../lib/claude";
import { db } from "../db";
import { users } from "../db/schema";
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
import { resolveKnowledge, toSessionContext } from "../lib/knowledge-resolver";
import { knowledgeSources } from "../db/schema";

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

  const agentContexts: Record<AgentType, string> = {
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
  };

  return agentContexts[agentType];
}

export default router;
