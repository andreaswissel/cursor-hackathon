import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { sessionStore, SessionContext, SessionEvents } from "../lib/session-store";
import { OrchestratorAgent } from "../agents/orchestrator-agent";

const router = Router();

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
  sessionStore.create(sessionId, idea, context);

  // Start orchestrator in background
  const orchestrator = new OrchestratorAgent();
  orchestrator.run({ sessionId, idea, context }).catch((error) => {
    console.error("Orchestrator error:", error);
    sessionStore.setSessionStatus(sessionId, "failed");
  });

  res.json({ sessionId });
});

// Get session state
router.get("/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const state = sessionStore.getState(sessionId);

  if (!state) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(state);
});

// SSE endpoint for real-time updates
router.get("/:sessionId/stream", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.get(sessionId);

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
  const state = sessionStore.getState(sessionId);
  res.write(`data: ${JSON.stringify({ type: "init", payload: state })}\n\n`);

  // Subscribe to events
  const unsubscribers: Array<() => void> = [];

  const eventTypes: Array<keyof SessionEvents> = [
    "agent:log",
    "agent:status",
    "agent:question",
    "agent:output",
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

// Answer a question
router.post("/:sessionId/answer", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { agentType, questionId, answer } = req.body as {
    agentType: string;
    questionId: string;
    answer: string;
  };

  const session = sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Clear the question and resume the agent
  // TODO: Actually resume the agent with the answer
  sessionStore.clearAgentQuestion(sessionId, agentType as "orchestrator" | "discovery" | "strategy" | "spec" | "gtm");
  sessionStore.setAgentStatus(sessionId, agentType as "orchestrator" | "discovery" | "strategy" | "spec" | "gtm", "running");

  res.json({ success: true });
});

export default router;
