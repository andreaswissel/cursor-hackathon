import { useParams } from "react-router-dom";
import { useSessionStream } from "@/hooks/use-session-stream";
import { AgentPanel } from "@/components/agent-panel";
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
} from "lucide-react";
import { useState, useEffect } from "react";
import { getAllSessions, type SessionSummary } from "@/lib/api";

const AGENT_ORDER: AgentType[] = [
  "orchestrator",
  "discovery",
  "strategy",
  "spec",
  "gtm",
];

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, isConnected, error } = useSessionStream(sessionId ?? "");
  const [copied, setCopied] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    getAllSessions()
      .then(({ sessions }) => setAllSessions(sessions))
      .catch(console.error);
  }, []);

  const handleCopySpec = () => {
    if (session?.outputs.spec) {
      navigator.clipboard.writeText(session.outputs.spec);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Invalid session</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
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
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const completedAgents = AGENT_ORDER.filter(
    (type) => session.agents[type]?.status === "completed"
  ).length;

  return (
    <div className="flex h-screen">
      <Sidebar sessions={allSessions} />

      <main className="flex-1 flex overflow-hidden">
        {/* Agent panels */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="font-semibold truncate">{session.idea}</h1>
                <div className="flex items-center gap-3 mt-1">
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

          {/* Agents Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {AGENT_ORDER.map((type) => (
                <AgentPanel
                  key={type}
                  type={type}
                  agent={session.agents[type]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Output sidebar */}
        <div className="w-[420px] border-l bg-secondary/20 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-secondary/80 backdrop-blur border-b px-5 py-4">
            <h2 className="font-semibold text-sm">Outputs</h2>
          </div>

          <div className="p-5 space-y-6">
            {session.outputs.spec ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Feature Spec</p>
                      <p className="text-xs text-muted-foreground">
                        Ready for Cursor
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopySpec}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="rounded-xl border bg-card p-4 prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                  <ReactMarkdown>{session.outputs.spec}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Waiting for agents to complete...
                </p>
              </div>
            )}

            {session.outputs.slidesUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Slides Created</span>
                </div>
                <a
                  href={session.outputs.slidesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Open Google Slides
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
