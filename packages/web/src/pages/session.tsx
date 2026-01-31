import { useParams } from "react-router-dom";
import { useSessionStream } from "@/hooks/use-session-stream";
import { AgentPanel } from "@/components/agent-panel";
import { AgentDetailModal } from "@/components/agent-detail-modal";
import { Sidebar } from "@/components/sidebar";
import type { AgentType } from "@product-os/shared";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  FileText,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Share2,
  Cpu,
  Package,
  Presentation,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getAllSessions, type SessionSummary } from "@/lib/api";
import { CursorHandoff } from "@/components/cursor-handoff";

const AGENT_ORDER: AgentType[] = [
  "orchestrator",
  "discovery",
  "strategy",
  "spec",
  "gtm",
  "product-marketing",
];

// Agents that actually represent progress steps (excludes orchestrator which runs the whole time)
const PROGRESS_AGENTS: AgentType[] = ["discovery", "strategy", "spec", "gtm", "product-marketing"];

// Human-friendly descriptions for each agent phase
const AGENT_PROGRESS_INFO: Record<AgentType, { title: string; description: string }> = {
  orchestrator: {
    title: "Coordinating Workflow",
    description: "Setting up the product analysis pipeline and coordinating agents...",
  },
  discovery: {
    title: "Discovering Insights",
    description: "Analyzing customer feedback and filtering relevant insights for your idea...",
  },
  strategy: {
    title: "Crafting Strategy",
    description: "Developing product positioning and identifying market opportunities...",
  },
  spec: {
    title: "Writing Specification",
    description: "Creating detailed technical requirements and acceptance criteria...",
  },
  gtm: {
    title: "Planning Go-to-Market",
    description: "Building launch strategy and defining success metrics...",
  },
  "product-marketing": {
    title: "Creating Product Update",
    description: "Writing internal announcement for Teams/Slack...",
  },
};

type TabType = "agents" | "outputs";

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, isConnected, error } = useSessionStream(sessionId ?? "");
  const [copied, setCopied] = useState(false);
  const [copiedUpdate, setCopiedUpdate] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("agents");

  const refreshSessions = () => {
    getAllSessions()
      .then(({ sessions }) => setAllSessions(sessions))
      .catch(console.error);
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  // Auto-switch to outputs tab when session completes
  useEffect(() => {
    if (session?.status === "completed" && session?.outputs.spec) {
      setActiveTab("outputs");
    }
  }, [session?.status, session?.outputs.spec]);

  const handleCopySpec = () => {
    if (session?.outputs.spec) {
      navigator.clipboard.writeText(session.outputs.spec);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyProductUpdate = () => {
    if (session?.outputs.productUpdate) {
      navigator.clipboard.writeText(session.outputs.productUpdate);
      setCopiedUpdate(true);
      setTimeout(() => setCopiedUpdate(false), 2000);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center pt-14 md:pt-0">
          <p className="text-muted-foreground">Invalid session</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center pt-14 md:pt-0">
          <div className="text-center space-y-2">
            <XCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="font-medium">Connection Error</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center pt-14 md:pt-0">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const completedAgents = AGENT_ORDER.filter(
    (type) => session.agents[type]?.status === "completed"
  ).length;

  const hasOutputs = !!session.outputs.spec;
  const outputCount = [
    session.outputs.spec,
    session.outputs.productUpdate,
    session.outputs.slidesUrl,
  ].filter(Boolean).length;

  return (
    <div className="flex h-screen">
      <Sidebar sessions={allSessions} onSessionDeleted={refreshSessions} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with tabs */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b mt-14 md:mt-0">
          {/* Title bar */}
          <div className="px-4 md:px-6 py-4 border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="font-semibold truncate text-sm md:text-base">{session.idea}</h1>
                <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {completedAgents}/{AGENT_ORDER.length} agents complete
                  </span>
                  {session.promptCount !== undefined && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        <span className={cn(
                          "text-xs",
                          session.promptCount >= 5 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          {session.promptCount}/5 prompts
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  session.status === "completed" &&
                    "bg-emerald-500/10 text-emerald-600",
                  session.status === "running" && "bg-blue-500/10 text-blue-600",
                  session.status === "failed" && "bg-red-500/10 text-red-600",
                  session.status === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {session.status}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 md:px-6">
            <div className="flex gap-1 py-2">
              <button
                onClick={() => setActiveTab("agents")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === "agents"
                    ? "bg-foreground text-background shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Cpu className="w-4 h-4" />
                <span>Agents</span>
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded text-xs",
                  activeTab === "agents" ? "bg-background/20" : "bg-secondary"
                )}>
                  {completedAgents}/{AGENT_ORDER.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("outputs")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === "outputs"
                    ? "bg-foreground text-background shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  hasOutputs && activeTab !== "outputs" && "ring-2 ring-emerald-500/50"
                )}
              >
                <Package className="w-4 h-4" />
                <span>Outputs</span>
                {hasOutputs && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded text-xs",
                    activeTab === "outputs" ? "bg-background/20" : "bg-emerald-500/20 text-emerald-600"
                  )}>
                    {outputCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "agents" ? (
            <>
              {/* Progress Indicator */}
              {session.status === "running" && (() => {
                const runningAgentIndex = PROGRESS_AGENTS.findIndex(
                  (type) => session.agents[type]?.status === "running"
                );
                const runningAgent = runningAgentIndex >= 0 ? PROGRESS_AGENTS[runningAgentIndex] : null;
                const completedWorkerAgents = PROGRESS_AGENTS.filter(
                  (type) => session.agents[type]?.status === "completed"
                ).length;
                const progressPercent = runningAgentIndex >= 0
                  ? ((runningAgentIndex + 1) / PROGRESS_AGENTS.length) * 100
                  : (completedWorkerAgents / PROGRESS_AGENTS.length) * 100;
                const info = runningAgent ? AGENT_PROGRESS_INFO[runningAgent] : null;

                return (
                  <div className="mx-4 md:mx-6 mt-4 p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-foreground/70 animate-spin" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">
                          {info?.title || "Processing..."}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {info?.description || "Working on your product idea..."}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground/80 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Agents Grid */}
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {AGENT_ORDER.map((type) => (
                    <AgentPanel
                      key={type}
                      type={type}
                      agent={session.agents[type]}
                      onClick={() => setSelectedAgent(type)}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Outputs View */
            <div className="p-4 md:p-8 max-w-6xl mx-auto">
              {hasOutputs ? (
                <div className="space-y-8">
                  {/* Hero: Cursor Handoff */}
                  <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500/10 via-background to-indigo-500/10 p-6 md:p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-full blur-3xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        <span className="text-sm font-semibold text-violet-600">Ready to Build</span>
                      </div>
                      <CursorHandoff spec={session.outputs.spec!} ideaTitle={session.idea} />
                    </div>
                  </div>

                  {/* Output Cards Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Feature Spec Card */}
                    <div className="rounded-2xl border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b bg-emerald-500/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-semibold">Feature Specification</p>
                            <p className="text-xs text-muted-foreground">
                              Technical requirements & acceptance criteria
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleCopySpec}
                          className="p-2.5 hover:bg-secondary rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <div className="p-5 max-h-[500px] overflow-y-auto">
                        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                          <ReactMarkdown>{session.outputs.spec}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {/* Product Update Card */}
                    {session.outputs.productUpdate && (
                      <div className="rounded-2xl border bg-card overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-500/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                              <Share2 className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-semibold">Product Update</p>
                              <p className="text-xs text-muted-foreground">
                                Ready for Teams / Slack
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleCopyProductUpdate}
                            className="p-2.5 hover:bg-secondary rounded-lg transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedUpdate ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        <div className="p-5 max-h-[500px] overflow-y-auto">
                          <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                            <ReactMarkdown>{session.outputs.productUpdate}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Slides Card */}
                    {session.outputs.slidesUrl && (
                      <div className="rounded-2xl border bg-card overflow-hidden lg:col-span-2">
                        <div className="flex items-center justify-between px-5 py-4 border-b bg-orange-500/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                              <Presentation className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-semibold">Presentation Slides</p>
                              <p className="text-xs text-muted-foreground">
                                Google Slides deck ready to present
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs text-emerald-600 font-medium">Generated</span>
                          </div>
                        </div>
                        <div className="p-5">
                          <a
                            href={session.outputs.slidesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg"
                          >
                            <Presentation className="w-5 h-5" />
                            Open in Google Slides
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6">
                    <Package className="w-9 h-9 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No outputs yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Outputs will appear here once the agents have finished processing your product idea.
                  </p>
                  <button
                    onClick={() => setActiveTab("agents")}
                    className="mt-6 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
                  >
                    View Agent Progress
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Agent Detail Modal */}
        {selectedAgent && (
          <AgentDetailModal
            isOpen={!!selectedAgent}
            onClose={() => setSelectedAgent(null)}
            sessionId={sessionId}
            agentType={selectedAgent}
            agent={session.agents[selectedAgent]}
            onMessageSent={refreshSessions}
          />
        )}
      </main>
    </div>
  );
}
