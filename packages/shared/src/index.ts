export type UserRole = "pm_automation" | "engineer_support" | "pm_builder";
export type AgentMode = "guided" | "balanced" | "autonomous";
export type TeamRole = "owner" | "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

export interface UserPreferences {
  role?: UserRole;
  agentMode?: AgentMode;
  frameworks?: {
    jiraTaxonomy?: boolean;
    definitionOfDone?: boolean;
    okrAlignment?: boolean;
    customTemplate?: boolean;
  };
  completedAt?: string;
}

export type AgentType = "orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "product-marketing" | "doc-orchestrator" | "transcription" | "doc-generator" | "flow-orchestrator" | "code-agent" | "review-agent" | "changelog-agent";
export type AgentStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";
export type SessionStatus = "pending" | "running" | "waiting_input" | "completed" | "failed";
export type SessionMode = "idea-to-spec" | "documentation" | "discover" | "flow";

// Flow Mode types
export type FlowArtifactType = "plan" | "code-diff" | "review" | "spec" | "document" | "pr-link" | "changelog" | "discovery" | "strategy" | "gtm" | "product-marketing";

export interface FlowArtifact {
  id: string;
  sessionId: string;
  type: FlowArtifactType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  status: "generating" | "ready" | "error";
  createdAt: string;
  updatedAt: string;
}
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

export type SandboxStatus = "idle" | "cloning" | "ready" | "running" | "error";

export interface Session {
  id: string;
  idea: string;
  context: SessionContext;
  status: SessionStatus;
  promptCount?: number;
  mode?: SessionMode;
  projectId?: string;
  repoUrl?: string;
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

export interface Team {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user?: { id: string; email: string; displayName?: string | null; avatarUrl?: string | null };
}

export interface TeamInvite {
  id: string;
  teamId: string;
  invitedByUserId: string;
  invitedEmail?: string | null;
  role: TeamRole;
  status: InviteStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  team?: Team;
  invitedBy?: { email: string; displayName?: string | null };
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  onboardingCompleted?: boolean;
  preferences?: UserPreferences | null;
  teams?: Array<{ teamId: string; teamName: string; teamSlug: string; role: TeamRole }>;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithSessions extends Project {
  sessions: Array<{ id: string; idea: string; status: string; mode?: SessionMode; createdAt: string }>;
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
    | "documentation:piece:updated"
    | "artifact:created"
    | "artifact:updated"
    | "artifact:deleted";
  payload: unknown;
}

// Roadmap types
export type RoadmapItemStatus = "backlog" | "planned" | "in-progress" | "done";
export type RoadmapItemPriority = "low" | "medium" | "high" | "critical";

export interface RoadmapItem {
  id: string;
  userId: string;
  teamId?: string | null;
  title: string;
  description?: string | null;
  status: RoadmapItemStatus;
  priority: RoadmapItemPriority;
  targetQuarter?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  order: number;
  linkedSessionIds: string[];
  linkedSessions?: Array<{ id: string; idea: string; status: string; mode?: string }>;
  createdAt: string;
  updatedAt: string;
}

// Knowledge types
export type KnowledgeVisibility = "team" | "private";

export interface KnowledgeFilter {
  keywords?: string[];
  channels?: string[];
  sourceIds?: string[];
  integrationDataIds?: string[];
  dateRange?: { from?: string; to?: string };
}

export interface KnowledgeSource {
  id: string;
  projectId: string;
  createdByUserId: string;
  name: string;
  description?: string | null;
  provider?: string | null;
  dataTypes?: string[] | null;
  filters: KnowledgeFilter;
  visibility: KnowledgeVisibility;
  aiSummary?: string | null;
  aiSummaryGeneratedAt?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  matchedItemCount?: number;
}

export interface SessionKnowledgeOverride {
  id: string;
  sessionId: string;
  knowledgeSourceId?: string | null;
  integrationDataId?: string | null;
  action: "add" | "remove";
  createdAt: string;
}

// Discovery mode types
export type DiscoveryRunStatus = "pending" | "running" | "completed" | "failed";

export interface DiscoveryRun {
  id: string;
  userId: string;
  status: DiscoveryRunStatus;
  signalCount: number;
  clusterCount: number;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface DiscoveryCluster {
  id: string;
  runId: string;
  userId: string;
  title: string;
  summary: string;
  featureSuggestion: string;
  compositeScore: number;
  signalCount: number;
  painSeverity: number;
  hasMoneyQuotes: boolean;
  recencyScore: number;
  moneyQuotes: string[];
  sampleSignals: string[];
  sources: string[];
  createdAt: string;
}

export interface DiscoveryDashboard {
  run: DiscoveryRun | null;
  clusters: DiscoveryCluster[];
  isMockData: boolean;
  isDemoData: boolean;
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

export const MOCK_DISCOVERY_CLUSTERS: DiscoveryCluster[] = [
  {
    id: "mock-1",
    runId: "mock-run",
    userId: "",
    title: "Search is broken — users can't find reports or features",
    summary: "Multiple signals from customers, support, and internal teams converge on a critical search/navigation failure. Users spend excessive time finding content, leading to churn risk and deal losses.",
    featureSuggestion: "Enable users to find any report, feature, or data point instantly through AI-powered semantic search with natural language queries",
    compositeScore: 92,
    signalCount: 8,
    painSeverity: 9,
    hasMoneyQuotes: true,
    recencyScore: 95,
    moneyQuotes: [
      "Your competitors have AI features now. When are you catching up? - Churned customer exit interview",
      "Sales team keeps asking for better search. Lost 2 deals this quarter because prospects couldn't find features during demos.",
    ],
    sampleSignals: [
      "I can never find the report I need. Search is completely broken. - Enterprise PM",
      "Spent 20 minutes looking for last quarter's revenue breakdown. Gave up. - Sales lead",
      "40% of tickets this week are 'how do I find X'. We need better discoverability ASAP.",
    ],
    sources: ["Customer Feedback", "Internal Slack", "Support Tickets"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    runId: "mock-run",
    userId: "",
    title: "Users want conversational data access instead of click-heavy UI",
    summary: "Users express desire to ask questions about their data naturally rather than navigating complex dashboard interfaces. Current UI only exposes 10% of capabilities to average users.",
    featureSuggestion: "Enable users to ask natural language questions about their data and receive instant, contextual answers with supporting visualizations",
    compositeScore: 78,
    signalCount: 4,
    painSeverity: 7,
    hasMoneyQuotes: true,
    recencyScore: 80,
    moneyQuotes: [
      "Board is asking about our AI strategy. Competitors are shipping AI features monthly. We need to move faster.",
    ],
    sampleSignals: [
      "Would love to just ASK questions about my data instead of clicking around. - Startup founder",
      "The dashboard is powerful but I only use 10% because I can't find the rest. - Mid-market ops manager",
      "Too many clicks to get anywhere. Navigation is a maze. - Power user, 2yr customer",
    ],
    sources: ["Customer Feedback", "Internal Slack"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-3",
    runId: "mock-run",
    userId: "",
    title: "Declining user retention linked to poor feature discoverability",
    summary: "Product metrics show a concerning trend: search success rate is dropping, time-to-find is increasing, and 30-day retention is declining. Feature discovery rate is stuck at 23%, meaning users miss most of the product's value.",
    featureSuggestion: "Enable users to discover relevant features through contextual, proactive suggestions based on their usage patterns and goals",
    compositeScore: 65,
    signalCount: 3,
    painSeverity: 6,
    hasMoneyQuotes: false,
    recencyScore: 70,
    moneyQuotes: [],
    sampleSignals: [
      "Search Success Rate: 34%, down -8% MoM",
      "Feature Discovery Rate: 23%, flat",
      "User Retention (30d): 61%, down -4% MoM",
    ],
    sources: ["Product Metrics"],
    createdAt: new Date().toISOString(),
  },
];
