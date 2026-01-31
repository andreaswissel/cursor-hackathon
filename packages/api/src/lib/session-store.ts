import { TypedEventEmitter } from "./event-emitter";

export type AgentType = "orchestrator" | "discovery" | "strategy" | "spec" | "gtm";
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
  idea: string;
  context: SessionContext;
  status: "pending" | "running" | "waiting_input" | "completed" | "failed";
  agents: Map<AgentType, AgentState>;
  outputs: {
    spec?: string;
    slidesUrl?: string;
    validation?: string;
    strategy?: string;
  };
  createdAt: Date;
}

export interface SessionEvents {
  "agent:log": { sessionId: string; agentType: AgentType; log: AgentLog };
  "agent:status": { sessionId: string; agentType: AgentType; status: AgentStatus };
  "agent:question": { sessionId: string; agentType: AgentType; questionId: string; question: string };
  "agent:output": { sessionId: string; agentType: AgentType; output: unknown };
  "session:status": { sessionId: string; status: Session["status"] };
  "session:output": { sessionId: string; type: keyof Session["outputs"]; content: string };
}

class SessionStore {
  private sessions = new Map<string, Session>();
  public events = new TypedEventEmitter<SessionEvents>();

  create(id: string, idea: string, context: SessionContext): Session {
    const session: Session = {
      id,
      idea,
      context,
      status: "pending",
      agents: new Map(),
      outputs: {},
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  initAgent(sessionId: string, agentType: AgentType, agentId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.agents.set(agentType, {
      id: agentId,
      type: agentType,
      status: "pending",
      logs: [],
    });
  }

  appendLog(sessionId: string, agentType: AgentType, content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    const log: AgentLog = {
      timestamp: new Date().toISOString(),
      content,
    };
    agent.logs.push(log);
    this.events.emit("agent:log", { sessionId, agentType, log });
  }

  setAgentStatus(sessionId: string, agentType: AgentType, status: AgentStatus): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.status = status;
    this.events.emit("agent:status", { sessionId, agentType, status });
  }

  setAgentQuestion(sessionId: string, agentType: AgentType, questionId: string, question: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.currentQuestion = { id: questionId, question };
    agent.status = "waiting_input";
    this.events.emit("agent:status", { sessionId, agentType, status: "waiting_input" });
    this.events.emit("agent:question", { sessionId, agentType, questionId, question });
  }

  clearAgentQuestion(sessionId: string, agentType: AgentType): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.currentQuestion = undefined;
  }

  setAgentOutput(sessionId: string, agentType: AgentType, output: unknown): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentType);
    if (!agent) return;

    agent.output = output;
    this.events.emit("agent:output", { sessionId, agentType, output });
  }

  setSessionStatus(sessionId: string, status: Session["status"]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = status;
    this.events.emit("session:status", { sessionId, status });
  }

  setSessionOutput(sessionId: string, type: keyof Session["outputs"], content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.outputs[type] = content;
    this.events.emit("session:output", { sessionId, type, content });
  }

  getState(sessionId: string): {
    session: Omit<Session, "agents"> & { agents: Record<AgentType, AgentState> };
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      session: {
        ...session,
        agents: Object.fromEntries(session.agents) as Record<AgentType, AgentState>,
      },
    };
  }
}

export const sessionStore = new SessionStore();
