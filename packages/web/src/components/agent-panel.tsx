import { useEffect, useRef } from "react";
import type { AgentState, AgentType } from "@product-os/shared";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, HelpCircle, Clock } from "lucide-react";

interface AgentPanelProps {
  agent: AgentState | undefined;
  type: AgentType;
}

const AGENT_LABELS: Record<AgentType, { name: string; description: string }> = {
  orchestrator: {
    name: "Orchestrator",
    description: "Coordinates all agents",
  },
  discovery: {
    name: "Discovery",
    description: "Validates against customer feedback",
  },
  strategy: {
    name: "Strategy",
    description: "Checks OKR alignment",
  },
  spec: {
    name: "Spec Writer",
    description: "Generates feature specification",
  },
  gtm: {
    name: "GTM",
    description: "Creates launch materials",
  },
};

const STATUS_ICONS = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  waiting_input: <HelpCircle className="h-4 w-4 text-yellow-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

export function AgentPanel({ agent, type }: AgentPanelProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const label = AGENT_LABELS[type];
  const status = agent?.status ?? "pending";

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [agent?.logs]);

  const logContent = agent?.logs.map((l) => l.content).join("") ?? "";

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card",
        status === "running" && "border-blue-500/50",
        status === "completed" && "border-green-500/30",
        status === "failed" && "border-red-500/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <div className="flex items-center gap-2">
            {STATUS_ICONS[status]}
            <span className="font-medium">{label.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {label.description}
          </p>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={logRef}
        className="agent-log flex-1 p-4 overflow-y-auto min-h-[200px] max-h-[400px] bg-black/20"
      >
        {logContent || (
          <span className="text-muted-foreground">Waiting to start...</span>
        )}
      </div>

      {/* Question input (if waiting for input) */}
      {agent?.currentQuestion && (
        <div className="p-4 border-t bg-yellow-500/10">
          <p className="text-sm font-medium mb-2">
            {agent.currentQuestion.question}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Your answer..."
            />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
