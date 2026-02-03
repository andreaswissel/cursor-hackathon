export type AgentType = "orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "product-marketing" | "doc-orchestrator" | "transcription" | "doc-generator";
export type AgentStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";
export type SessionStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";
export type SessionMode = "idea-to-spec" | "documentation";
export type DocPieceType = "feature" | "workflow" | "use-case" | "tutorial" | "reference";
export type DocPieceStatus = "pending" | "accepted" | "declined" | "refined";

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

export interface VideoMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  duration?: number;
}

export interface DocumentationPiece {
  id: string;
  sessionId: string;
  pieceType: DocPieceType;
  title: string;
  content: string;
  status: DocPieceStatus;
  order: number;
  startTimestamp?: number;
  endTimestamp?: number;
  refinementHistory: Array<{
    timestamp: string;
    userMessage: string;
    previousContent: string;
    newContent: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  idea: string;
  context: SessionContext;
  status: SessionStatus;
  promptCount?: number;
  mode?: SessionMode;
  videoMetadata?: VideoMetadata;
  agents: Record<AgentType, AgentState>;
  outputs: {
    spec?: string;
    slidesUrl?: string;
    productUpdate?: string;
    validation?: string;
    strategy?: string;
  };
  documentationPieces?: DocumentationPiece[];
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
    | "session:output"
    | "documentation:piece"
    | "documentation:piece:updated";
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

export const MOCK_INTERNAL_FEEDBACK = [
  { channel: "#product", author: "Sarah (PM)", message: "Sales team keeps asking for better search. Lost 2 deals this quarter because prospects couldn't find features during demos." },
  { channel: "#engineering", author: "Mike (Tech Lead)", message: "We've had 3 escalations this week about search performance. Current implementation won't scale." },
  { channel: "#customer-success", author: "Lisa (CS Manager)", message: "NPS comments are brutal this month. 'Can't find anything' is the top complaint." },
  { channel: "#leadership", author: "CEO", message: "Board is asking about our AI strategy. Competitors are shipping AI features monthly. We need to move faster." },
  { channel: "#support", author: "Jake (Support Lead)", message: "40% of tickets this week are 'how do I find X'. We need better discoverability ASAP." },
];

export const MOCK_METRICS = [
  { name: "Search Usage", value: "12%", trend: "down", delta: "-3% MoM", source: "Mixpanel", description: "Users who use search at least once per session" },
  { name: "Search Success Rate", value: "34%", trend: "down", delta: "-8% MoM", source: "Mixpanel", description: "Searches that result in a click within 30s" },
  { name: "Avg. Time to Find Report", value: "4.2 min", trend: "up", delta: "+45s MoM", source: "Segment", description: "Time from login to opening first report" },
  { name: "Feature Discovery Rate", value: "23%", trend: "flat", delta: "0% MoM", source: "Amplitude", description: "% of features used by average user" },
  { name: "Support Tickets (Search)", value: "847", trend: "up", delta: "+22% MoM", source: "Zendesk", description: "Tickets mentioning search or navigation" },
  { name: "User Retention (30d)", value: "61%", trend: "down", delta: "-4% MoM", source: "Mixpanel", description: "Users returning within 30 days" },
];
