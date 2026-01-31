import { useParams } from "react-router-dom";
import { useSessionStream } from "@/hooks/use-session-stream";
import { AgentPanel } from "@/components/agent-panel";
import type { AgentType } from "@product-os/shared";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

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

  if (!sessionId) {
    return <div className="p-8">Invalid session</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-lg font-medium">Connection Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Product OS Session</h1>
            <p className="text-sm text-muted-foreground truncate max-w-xl">
              {session.idea}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-sm text-muted-foreground">
              {session.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Agent panels */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Agents
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AGENT_ORDER.map((type) => (
              <AgentPanel
                key={type}
                type={type}
                agent={session.agents[type]}
              />
            ))}
          </div>
        </div>

        {/* Output sidebar */}
        <div className="w-[500px] border-l p-6 overflow-y-auto bg-muted/30">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Outputs
          </h2>

          {session.outputs.spec ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Spec Generated</span>
              </div>
              <div className="rounded-lg border bg-card p-4 prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{session.outputs.spec}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Waiting for agents to complete...
            </div>
          )}

          {session.outputs.slidesUrl && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Slides Created</span>
              </div>
              <a
                href={session.outputs.slidesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open Google Slides
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
