import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, agentRuns, outputs, messages } from "../db/schema";
import { TypedEventEmitter } from "./event-emitter";

export type AgentType = "orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "product-marketing";
export type AgentStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";

export interface AgentLog {
  timestamp: string;
  content: string;
}

export interface AgentState {
  id: string;
  type: AgentType;
  status: AgentStatus;
  logs: AgentLog[];
  output?: unknown;
  currentQuestion?: {
    id: string;
    question: string;
  };
}

export interface SessionContext {
  okrs: Array<{ objective: string; keyResults: string[] }>;
  customerFeedback: string[];
  additionalDocs?: string;
}

export interface Session {
  id: string;
  userId?: string;
  idea: string;
  context: SessionContext;
  status: "pending" | "running" | "waiting_input" | "completed" | "failed";
  promptCount: number;
  agents: Map<AgentType, AgentState>;
  outputs: {
    spec?: string;
    slidesUrl?: string;
    productUpdate?: string;
    validation?: string;
    strategy?: string;
  };
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  agentType: AgentType;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface SessionEvents {
  "agent:init": { sessionId: string; agent: AgentState };
  "agent:log": { sessionId: string; agentType: AgentType; log: AgentLog };
  "agent:status": { sessionId: string; agentType: AgentType; status: AgentStatus };
  "agent:question": { sessionId: string; agentType: AgentType; questionId: string; question: string };
  "agent:output": { sessionId: string; agentType: AgentType; output: unknown };
  "agent:message": { sessionId: string; agentType: AgentType; message: ChatMessage };
  "session:status": { sessionId: string; status: Session["status"] };
  "session:output": { sessionId: string; type: keyof Session["outputs"]; content: string };
}

class SessionStore {
  // In-memory cache for active sessions (for SSE performance)
  private cache = new Map<string, Session>();
  public events = new TypedEventEmitter<SessionEvents>();

  // Create a new session
  async create(id: string, idea: string, context: SessionContext, userId?: string): Promise<Session> {
    // Insert into database
    await db.insert(sessions).values({
      id,
      userId,
      idea,
      context,
      status: "pending",
      promptCount: 1,
    });

    const session: Session = {
      id,
      userId,
      idea,
      context,
      status: "pending",
      promptCount: 1,
      agents: new Map(),
      outputs: {},
      createdAt: new Date(),
    };

    this.cache.set(id, session);
    return session;
  }

  // Get session from cache or load from DB
  async get(id: string): Promise<Session | undefined> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    // Load from database
    const [dbSession] = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!dbSession) return undefined;

    // Load agent runs
    const dbAgents = await db.select().from(agentRuns).where(eq(agentRuns.sessionId, id));

    // Load outputs
    const dbOutputs = await db.select().from(outputs).where(eq(outputs.sessionId, id));

    // Build session object
    const session: Session = {
      id: dbSession.id,
      userId: dbSession.userId ?? undefined,
      idea: dbSession.idea,
      context: dbSession.context as SessionContext,
      status: dbSession.status,
      promptCount: dbSession.promptCount,
      agents: new Map(),
      outputs: {},
      createdAt: dbSession.createdAt,
    };

    // Add agents
    for (const agent of dbAgents) {
      session.agents.set(agent.agentType as AgentType, {
        id: agent.id,
        type: agent.agentType as AgentType,
        status: agent.status as AgentStatus,
        logs: (agent.logs as AgentLog[]) ?? [],
        output: agent.output,
      });
    }

    // Add outputs
    for (const output of dbOutputs) {
      session.outputs[output.type as keyof Session["outputs"]] = output.content;
    }

    this.cache.set(id, session);
    return session;
  }

  // Get all sessions (for sidebar)
  async getAll(): Promise<Array<{ id: string; idea: string; status: string; createdAt: Date }>> {
    const dbSessions = await db
      .select({
        id: sessions.id,
        idea: sessions.idea,
        status: sessions.status,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .orderBy(sessions.createdAt);

    return dbSessions.map((s) => ({
      id: s.id,
      idea: s.idea,
      status: s.status,
      createdAt: s.createdAt,
    }));
  }

  // Get all sessions for a specific user
  async getAllForUser(userId: string): Promise<Array<{ id: string; idea: string; status: string; promptCount: number; createdAt: Date }>> {
    const dbSessions = await db
      .select({
        id: sessions.id,
        idea: sessions.idea,
        status: sessions.status,
        promptCount: sessions.promptCount,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(sessions.createdAt);

    return dbSessions.map((s) => ({
      id: s.id,
      idea: s.idea,
      status: s.status,
      promptCount: s.promptCount,
      createdAt: s.createdAt,
    }));
  }

  // Initialize an agent
  async initAgent(sessionId: string, agentType: AgentType, agentId: string): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session) return;

    // Insert into database
    await db.insert(agentRuns).values({
      id: agentId,
      sessionId,
      agentType,
      status: "pending",
      logs: [],
    });

    const agent: AgentState = {
      id: agentId,
      type: agentType,
      status: "pending",
      logs: [],
    };

    session.agents.set(agentType, agent);
    this.events.emit("agent:init", { sessionId, agent });
  }

  // Append log to agent
  async appendLog(sessionId: string, agentType: AgentType, content: string): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    const log: AgentLog = {
      timestamp: new Date().toISOString(),
      content,
    };

    agent.logs.push(log);

    // Update database (batch this in production)
    await db
      .update(agentRuns)
      .set({ logs: agent.logs, updatedAt: new Date() })
      .where(eq(agentRuns.id, agent.id));

    this.events.emit("agent:log", { sessionId, agentType, log });
  }

  // Set agent status
  async setAgentStatus(sessionId: string, agentType: AgentType, status: AgentStatus): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.status = status;

    // Update database
    await db
      .update(agentRuns)
      .set({ status, updatedAt: new Date() })
      .where(eq(agentRuns.id, agent.id));

    this.events.emit("agent:status", { sessionId, agentType, status });
  }

  // Set agent output
  async setAgentOutput(sessionId: string, agentType: AgentType, output: unknown): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.output = output;

    // Update database
    await db
      .update(agentRuns)
      .set({ output, updatedAt: new Date() })
      .where(eq(agentRuns.id, agent.id));

    this.events.emit("agent:output", { sessionId, agentType, output });
  }

  // Set session status
  async setSessionStatus(sessionId: string, status: Session["status"]): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session) return;

    session.status = status;

    // Update database
    await db
      .update(sessions)
      .set({ status, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    this.events.emit("session:status", { sessionId, status });
  }

  // Set session output
  async setSessionOutput(sessionId: string, type: keyof Session["outputs"], content: string): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session) return;

    session.outputs[type] = content;

    // Upsert into outputs table
    await db.insert(outputs).values({
      sessionId,
      type,
      content,
    });

    this.events.emit("session:output", { sessionId, type, content });
  }

  // Add chat message
  async addMessage(
    sessionId: string,
    agentType: AgentType,
    role: "user" | "assistant",
    content: string
  ): Promise<ChatMessage> {
    const [inserted] = await db
      .insert(messages)
      .values({
        sessionId,
        agentType,
        role,
        content,
      })
      .returning();

    const message: ChatMessage = {
      id: inserted.id,
      sessionId: inserted.sessionId,
      agentType: inserted.agentType as AgentType,
      role: inserted.role as "user" | "assistant",
      content: inserted.content,
      createdAt: inserted.createdAt,
    };

    this.events.emit("agent:message", { sessionId, agentType, message });
    return message;
  }

  // Get chat messages for an agent
  async getMessages(sessionId: string, agentType: AgentType): Promise<ChatMessage[]> {
    const dbMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);

    return dbMessages
      .filter((m) => m.agentType === agentType)
      .map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        agentType: m.agentType as AgentType,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt,
      }));
  }

  // Get state for SSE initial payload
  async getState(sessionId: string): Promise<{
    session: Omit<Session, "agents"> & { agents: Record<AgentType, AgentState> };
  } | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    return {
      session: {
        ...session,
        agents: Object.fromEntries(session.agents) as Record<AgentType, AgentState>,
      },
    };
  }

  // Delete a session and all related data
  async delete(sessionId: string): Promise<boolean> {
    // Delete from database (cascade will handle related tables if set up, otherwise delete manually)
    await db.delete(messages).where(eq(messages.sessionId, sessionId));
    await db.delete(outputs).where(eq(outputs.sessionId, sessionId));
    await db.delete(agentRuns).where(eq(agentRuns.sessionId, sessionId));
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    // Remove from cache
    this.cache.delete(sessionId);

    return true;
  }

  // Legacy sync methods for backwards compatibility during migration
  // These will be removed once all callers are updated to use async versions

  setAgentQuestion(sessionId: string, agentType: AgentType, questionId: string, question: string): void {
    const session = this.cache.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.currentQuestion = { id: questionId, question };
    agent.status = "waiting_input";
    this.events.emit("agent:status", { sessionId, agentType, status: "waiting_input" });
    this.events.emit("agent:question", { sessionId, agentType, questionId, question });
  }

  clearAgentQuestion(sessionId: string, agentType: AgentType): void {
    const session = this.cache.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.currentQuestion = undefined;
  }
}

export const sessionStore = new SessionStore();
