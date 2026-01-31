export type AgentType = "orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "product-marketing";
export type AgentStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";
export type SessionStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";

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
  status: SessionStatus;
  promptCount?: number;
  agents: Record<AgentType, AgentState>;
  outputs: {
    spec?: string;
    slidesUrl?: string;
    productUpdate?: string;
    validation?: string;
    strategy?: string;
  };
  createdAt: string;
}

export interface SSEEvent {
  type:
    | "init"
    | "agent:init"
    | "agent:log"
    | "agent:status"
    | "agent:question"
    | "agent:output"
    | "session:status"
    | "session:output";
  payload: unknown;
}

// Mock data for demo
export const MOCK_OKRS = [
  {
    objective: "Increase user engagement",
    keyResults: [
      "Increase daily active usage by 20%",
      "Reduce time-to-insight by 40%",
    ],
  },
  {
    objective: "Reduce support burden",
    keyResults: [
      "Decrease support tickets by 30%",
      "Self-service resolution rate → 60%",
    ],
  },
];

export const MOCK_CUSTOMER_FEEDBACK = [
  "I can never find the report I need. Search is completely broken. - Enterprise PM",
  "Would love to just ASK questions about my data instead of clicking around. - Startup founder",
  "Spent 20 minutes looking for last quarter's revenue breakdown. Gave up. - Sales lead",
  "Too many clicks to get anywhere. Navigation is a maze. - Power user, 2yr customer",
  "Your competitors have AI features now. When are you catching up? - Churned customer exit interview",
  "The dashboard is powerful but I only use 10% because I can't find the rest. - Mid-market ops manager",
];
