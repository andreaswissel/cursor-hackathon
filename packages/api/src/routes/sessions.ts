import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { sessionStore, SessionContext, SessionEvents, AgentType } from "../lib/session-store";
import { OrchestratorAgent } from "../agents/orchestrator-agent";
import { streamCompletion } from "../lib/claude";

const router = Router();

// Get all sessions (for sidebar)
router.get("/", async (_req: Request, res: Response) => {
  const sessions = await sessionStore.getAll();
  res.json({ sessions });
});

// Create a new session
router.post("/", async (req: Request, res: Response) => {
  const { idea, context } = req.body as {
    idea: string;
    context: SessionContext;
  };

  if (!idea || !context) {
    res.status(400).json({ error: "Missing idea or context" });
    return;
  }

  const sessionId = uuid();
  await sessionStore.create(sessionId, idea, context);

  // Start orchestrator in background
  const orchestrator = new OrchestratorAgent();
  orchestrator.run({ sessionId, idea, context }).catch((error) => {
    console.error("Orchestrator error:", error);
    sessionStore.setSessionStatus(sessionId, "failed");
  });

  res.json({ sessionId });
});

// Get session state
router.get("/:sessionId", async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const state = await sessionStore.getState(sessionId);

  if (!state) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(state);
});

// SSE endpoint for real-time updates
router.get("/:sessionId/stream", async (req: Request, res: Response) => {
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
router.post("/:sessionId/chat", async (req: Request, res: Response) => {
  const { sessionId } = req.params;
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
        // Save assistant message
        await sessionStore.addMessage(sessionId, agentType, "assistant", fullResponse);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      },
      onError: (error) => {
        res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
        res.end();
      },
    });
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: "error", error: (error as Error).message })}\n\n`);
    res.end();
  }
});

// Get chat history for an agent
router.get("/:sessionId/chat/:agentType", async (req: Request, res: Response) => {
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
  };

  return agentContexts[agentType];
}

export default router;
