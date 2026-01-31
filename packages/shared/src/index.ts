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
  internalFeedback?: Array<{ channel: string; author: string; message: string }>;
  metrics?: Array<{ name: string; value: string; trend: string; delta: string; source: string; description: string }>;
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

// Mock data for demo - Devils Advocate context (PDF Export feature)
export const MOCK_OKRS = [
  {
    objective: "Increase user engagement and virality",
    keyResults: [
      "Increase session-to-share rate from 5% to 25%",
      "Grow weekly active users by 40% through organic sharing",
      "Achieve 3+ critique sessions per user per week",
    ],
  },
  {
    objective: "Reduce friction in user journey",
    keyResults: [
      "Decrease 'how do I share?' support tickets by 60%",
      "Reduce time from critique completion to sharing under 30 seconds",
      "Increase report export rate to 50% of completed sessions",
    ],
  },
];

export const MOCK_CUSTOMER_FEEDBACK = [
  "I loved the critique but had to screenshot it to share with my co-founder. That felt janky. - YC Founder",
  "Can I get a PDF? I need to present this to my team before we pitch tomorrow. - Hackathon participant",
  "The markdown export looks unprofessional. I can't send this to my mentor. - First-time founder",
  "Would pay for a nicely branded PDF I can attach to our accelerator application. - Startup CEO",
  "Great feedback but I had to copy-paste into Canva to make it presentable. You're losing me at the finish line. - Repeat user",
  "I want to share the report with my non-technical co-founder but markdown symbols confused them. - Technical founder",
];

export const MOCK_INTERNAL_FEEDBACK = [
  { channel: "#product", author: "Sarah (PM)", message: "Third user this week asked about PDF export. Feature request volume: PDF (12), dark mode (8), save history (6). Clear signal." },
  { channel: "#engineering", author: "Mike (Tech Lead)", message: "PDF generation isn't hard - puppeteer or react-pdf would work. Estimated effort: 4-6 hours for basic, 8-10 for branded." },
  { channel: "#customer-success", author: "Lisa (CS Manager)", message: "Lost a power user today. Quote: 'I can't share a markdown file with my non-technical co-founder.' We're losing them at the share moment." },
  { channel: "#leadership", author: "CEO", message: "If every PDF has our branding, that's impressions at scale. This could be our distribution hack for the hackathon." },
  { channel: "#support", author: "Jake (Support Lead)", message: "Created a saved reply for PDF requests - using it 8+ times this week. Users are screenshotting the critique panel as a workaround." },
];

export const MOCK_METRICS = [
  { name: "Markdown Export Rate", value: "23%", trend: "flat", delta: "0% WoW", source: "Mixpanel", description: "Users who click markdown export after critique" },
  { name: "Session Completion Rate", value: "78%", trend: "up", delta: "+5% WoW", source: "Mixpanel", description: "Users who wait for full critique to complete" },
  { name: "Share Intent (Exit Survey)", value: "67%", trend: "up", delta: "+12% WoW", source: "Typeform", description: "Users who say they want to share results" },
  { name: "Actual Share Rate", value: "8%", trend: "down", delta: "-2% WoW", source: "Mixpanel", description: "Users who successfully share (copy link/export)" },
  { name: "Support Tickets (Sharing)", value: "47", trend: "up", delta: "+18 WoW", source: "Intercom", description: "Tickets mentioning share, export, or PDF" },
  { name: "Return User Rate (7d)", value: "31%", trend: "flat", delta: "0% WoW", source: "Mixpanel", description: "Users returning within 7 days" },
];
