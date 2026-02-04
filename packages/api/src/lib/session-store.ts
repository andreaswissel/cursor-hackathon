import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, agentRuns, outputs, messages, documentationPieces } from "../db/schema";
import { TypedEventEmitter } from "./event-emitter";

export type AgentType = "orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "product-marketing" | "doc-orchestrator" | "transcription" | "doc-generator";
export type AgentStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";
export type SessionMode = "idea-to-spec" | "documentation";
export type DocPieceType = "feature" | "workflow" | "use-case" | "tutorial" | "reference";
export type DocPieceStatus = "pending" | "accepted" | "declined" | "refined";

export interface VideoMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  duration?: number;
}

export interface DocumentationPieceRecord {
  id: string;
  sessionId: string;
  pieceType: DocPieceType;
  title: string;
  content: string;
  status: DocPieceStatus;
  order: number;
  startTimestamp?: number | null;
  endTimestamp?: number | null;
  refinementHistory: Array<{
    timestamp: string;
    userMessage: string;
    previousContent: string;
    newContent: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

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
  internalFeedback?: Array<{ channel: string; author: string; message: string }>;
  metrics?: Array<{ name: string; value: string; trend: string; delta: string; source: string; description: string }>;
  additionalDocs?: string;
}

export interface PendingContinuation {
  phase: "strategy_rejected";
  previousOutputs: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId?: string;
  idea: string;
  context: SessionContext;
  status: "pending" | "running" | "waiting_input" | "completed" | "failed";
  promptCount: number;
  mode: SessionMode;
  videoMetadata?: VideoMetadata;
  agents: Map<AgentType, AgentState>;
  outputs: {
    spec?: string;
    slidesUrl?: string;
    productUpdate?: string;
    validation?: string;
    strategy?: string;
  };
  documentationPieces?: DocumentationPieceRecord[];
  pendingContinuation?: PendingContinuation;
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
  "documentation:piece": { sessionId: string; piece: DocumentationPieceRecord };
  "documentation:piece:updated": { sessionId: string; pieceId: string; piece: DocumentationPieceRecord };
}

class SessionStore {
  // In-memory cache for active sessions (for SSE performance)
  private cache = new Map<string, Session>();
  public events = new TypedEventEmitter<SessionEvents>();

  // Create a new session
  async create(
    id: string,
    idea: string,
    context: SessionContext,
    userId?: string,
    mode: SessionMode = "idea-to-spec",
    videoMetadata?: VideoMetadata
  ): Promise<Session> {
    // Insert into database
    await db.insert(sessions).values({
      id,
      userId,
      idea,
      context,
      status: "pending",
      promptCount: 1,
      mode,
      videoMetadata,
    });

    const session: Session = {
      id,
      userId,
      idea,
      context,
      status: "pending",
      promptCount: 1,
      mode,
      videoMetadata,
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

    // Load documentation pieces if documentation mode
    const dbDocPieces = dbSession.mode === "documentation"
      ? await db.select().from(documentationPieces).where(eq(documentationPieces.sessionId, id))
      : [];

    // Build session object
    const session: Session = {
      id: dbSession.id,
      userId: dbSession.userId ?? undefined,
      idea: dbSession.idea,
      context: dbSession.context as SessionContext,
      status: dbSession.status,
      promptCount: dbSession.promptCount,
      mode: dbSession.mode as SessionMode,
      videoMetadata: dbSession.videoMetadata as VideoMetadata | undefined,
      agents: new Map(),
      outputs: {},
      documentationPieces: dbDocPieces.map((p) => ({
        id: p.id,
        sessionId: p.sessionId,
        pieceType: p.pieceType as DocPieceType,
        title: p.title,
        content: p.content,
        status: p.status as DocPieceStatus,
        order: p.order,
        startTimestamp: p.startTimestamp,
        endTimestamp: p.endTimestamp,
        refinementHistory: (p.refinementHistory ?? []) as DocumentationPieceRecord["refinementHistory"],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
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
  async getAllForUser(userId: string): Promise<Array<{ id: string; idea: string; status: string; promptCount: number; mode: SessionMode; createdAt: Date }>> {
    const dbSessions = await db
      .select({
        id: sessions.id,
        idea: sessions.idea,
        status: sessions.status,
        promptCount: sessions.promptCount,
        mode: sessions.mode,
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
      mode: s.mode as SessionMode,
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
    await db.delete(documentationPieces).where(eq(documentationPieces.sessionId, sessionId));
    await db.delete(messages).where(eq(messages.sessionId, sessionId));
    await db.delete(outputs).where(eq(outputs.sessionId, sessionId));
    await db.delete(agentRuns).where(eq(agentRuns.sessionId, sessionId));
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    // Remove from cache
    this.cache.delete(sessionId);

    return true;
  }

  // Documentation pieces methods
  async addDocumentationPiece(
    sessionId: string,
    piece: Omit<DocumentationPieceRecord, "id" | "sessionId" | "createdAt" | "updatedAt">
  ): Promise<DocumentationPieceRecord> {
    const [inserted] = await db
      .insert(documentationPieces)
      .values({
        sessionId,
        pieceType: piece.pieceType,
        title: piece.title,
        content: piece.content,
        status: piece.status,
        order: piece.order,
        startTimestamp: piece.startTimestamp,
        endTimestamp: piece.endTimestamp,
        refinementHistory: piece.refinementHistory,
      })
      .returning();

    const record: DocumentationPieceRecord = {
      id: inserted.id,
      sessionId: inserted.sessionId,
      pieceType: inserted.pieceType as DocPieceType,
      title: inserted.title,
      content: inserted.content,
      status: inserted.status as DocPieceStatus,
      order: inserted.order,
      startTimestamp: inserted.startTimestamp,
      endTimestamp: inserted.endTimestamp,
      refinementHistory: (inserted.refinementHistory ?? []) as DocumentationPieceRecord["refinementHistory"],
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    };

    // Update cache
    const session = this.cache.get(sessionId);
    if (session) {
      if (!session.documentationPieces) {
        session.documentationPieces = [];
      }
      session.documentationPieces.push(record);
    }

    this.events.emit("documentation:piece", { sessionId, piece: record });
    return record;
  }

  async getDocumentationPieces(sessionId: string): Promise<DocumentationPieceRecord[]> {
    const dbPieces = await db
      .select()
      .from(documentationPieces)
      .where(eq(documentationPieces.sessionId, sessionId))
      .orderBy(documentationPieces.order);

    return dbPieces.map((p) => ({
      id: p.id,
      sessionId: p.sessionId,
      pieceType: p.pieceType as DocPieceType,
      title: p.title,
      content: p.content,
      status: p.status as DocPieceStatus,
      order: p.order,
      startTimestamp: p.startTimestamp,
      endTimestamp: p.endTimestamp,
      refinementHistory: (p.refinementHistory ?? []) as DocumentationPieceRecord["refinementHistory"],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async getDocumentationPiece(sessionId: string, pieceId: string): Promise<DocumentationPieceRecord | undefined> {
    const [piece] = await db
      .select()
      .from(documentationPieces)
      .where(eq(documentationPieces.id, pieceId));

    if (!piece || piece.sessionId !== sessionId) return undefined;

    return {
      id: piece.id,
      sessionId: piece.sessionId,
      pieceType: piece.pieceType as DocPieceType,
      title: piece.title,
      content: piece.content,
      status: piece.status as DocPieceStatus,
      order: piece.order,
      startTimestamp: piece.startTimestamp,
      endTimestamp: piece.endTimestamp,
      refinementHistory: (piece.refinementHistory ?? []) as DocumentationPieceRecord["refinementHistory"],
      createdAt: piece.createdAt,
      updatedAt: piece.updatedAt,
    };
  }

  async updateDocumentationPieceStatus(
    sessionId: string,
    pieceId: string,
    status: DocPieceStatus
  ): Promise<DocumentationPieceRecord | undefined> {
    const [updated] = await db
      .update(documentationPieces)
      .set({ status, updatedAt: new Date() })
      .where(eq(documentationPieces.id, pieceId))
      .returning();

    if (!updated || updated.sessionId !== sessionId) return undefined;

    const record: DocumentationPieceRecord = {
      id: updated.id,
      sessionId: updated.sessionId,
      pieceType: updated.pieceType as DocPieceType,
      title: updated.title,
      content: updated.content,
      status: updated.status as DocPieceStatus,
      order: updated.order,
      startTimestamp: updated.startTimestamp,
      endTimestamp: updated.endTimestamp,
      refinementHistory: (updated.refinementHistory ?? []) as DocumentationPieceRecord["refinementHistory"],
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    // Update cache
    const session = this.cache.get(sessionId);
    if (session?.documentationPieces) {
      const idx = session.documentationPieces.findIndex((p) => p.id === pieceId);
      if (idx >= 0) {
        session.documentationPieces[idx] = record;
      }
    }

    this.events.emit("documentation:piece:updated", { sessionId, pieceId, piece: record });
    return record;
  }

  async updateDocumentationPieceContent(
    sessionId: string,
    pieceId: string,
    content: string,
    userMessage: string
  ): Promise<DocumentationPieceRecord | undefined> {
    // Get current piece to preserve history
    const current = await this.getDocumentationPiece(sessionId, pieceId);
    if (!current) return undefined;

    const newHistory = [
      ...current.refinementHistory,
      {
        timestamp: new Date().toISOString(),
        userMessage,
        previousContent: current.content,
        newContent: content,
      },
    ];

    const [updated] = await db
      .update(documentationPieces)
      .set({
        content,
        status: "refined",
        refinementHistory: newHistory,
        updatedAt: new Date(),
      })
      .where(eq(documentationPieces.id, pieceId))
      .returning();

    if (!updated) return undefined;

    const record: DocumentationPieceRecord = {
      id: updated.id,
      sessionId: updated.sessionId,
      pieceType: updated.pieceType as DocPieceType,
      title: updated.title,
      content: updated.content,
      status: updated.status as DocPieceStatus,
      order: updated.order,
      startTimestamp: updated.startTimestamp,
      endTimestamp: updated.endTimestamp,
      refinementHistory: (updated.refinementHistory ?? []) as DocumentationPieceRecord["refinementHistory"],
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    // Update cache
    const session = this.cache.get(sessionId);
    if (session?.documentationPieces) {
      const idx = session.documentationPieces.findIndex((p) => p.id === pieceId);
      if (idx >= 0) {
        session.documentationPieces[idx] = record;
      }
    }

    this.events.emit("documentation:piece:updated", { sessionId, pieceId, piece: record });
    return record;
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

  setPendingContinuation(sessionId: string, continuation: PendingContinuation): void {
    const session = this.cache.get(sessionId);
    if (!session) return;
    session.pendingContinuation = continuation;
  }

  getPendingContinuation(sessionId: string): PendingContinuation | undefined {
    const session = this.cache.get(sessionId);
    return session?.pendingContinuation;
  }

  clearPendingContinuation(sessionId: string): void {
    const session = this.cache.get(sessionId);
    if (!session) return;
    session.pendingContinuation = undefined;
  }

  getAgentQuestion(sessionId: string, agentType: AgentType): { id: string; question: string } | undefined {
    const session = this.cache.get(sessionId);
    if (!session) return undefined;
    const agent = session.agents.get(agentType);
    return agent?.currentQuestion;
  }
}

export const sessionStore = new SessionStore();
