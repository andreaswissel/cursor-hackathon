import { useEffect, useRef } from "react";
import type { AgentState, AgentType } from "@product-os/shared";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Clock,
  Sparkles,
  Target,
  FileText,
  Megaphone,
  Compass,
  Share2,
  ChevronRight,
} from "lucide-react";

interface AgentPanelProps {
  agent: AgentState | undefined;
  type: AgentType;
  expanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

const AGENT_CONFIG: Record<
  AgentType,
  { name: string; description: string; icon: typeof Sparkles }
> = {
  orchestrator: {
    name: "Orchestrator",
    description: "Coordinates workflow",
    icon: Compass,
  },
  discovery: {
    name: "Discovery",
    description: "Validates problem",
    icon: Sparkles,
  },
  strategy: {
    name: "Strategy",
    description: "Checks OKR alignment",
    icon: Target,
  },
  spec: {
    name: "Spec Writer",
    description: "Generates specification",
    icon: FileText,
  },
  gtm: {
    name: "GTM",
    description: "Creates launch materials",
    icon: Megaphone,
  },
  "product-marketing": {
    name: "Product Marketing",
    description: "Internal product update",
    icon: Share2,
  },
};

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground/30",
    label: "Queued",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    dotColor: "bg-blue-500",
    label: "Running",
  },
  waiting_input: {
    icon: MessageCircle,
    color: "text-purple-500",
    dotColor: "bg-purple-500",
    label: "Needs Input",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    dotColor: "bg-emerald-500",
    label: "Complete",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    dotColor: "bg-red-500",
    label: "Failed",
  },
};

export function AgentPanel({ agent, type, expanded = true, onClick }: AgentPanelProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const agentConfig = AGENT_CONFIG[type];
  const status = agent?.status ?? "pending";
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const AgentIcon = agentConfig.icon;

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [agent?.logs]);

  const logContent = agent?.logs.map((l) => l.content).join("") ?? "";

  const isClickable = status === "completed" && onClick;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all",
        status === "running" && "ring-1 ring-blue-500/20",
        status === "completed" && "ring-1 ring-emerald-500/20",
        status === "failed" && "ring-1 ring-red-500/20",
        isClickable && "cursor-pointer hover:border-foreground/20 hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-secondary/30">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            status === "completed"
              ? "bg-emerald-500/10"
              : status === "running"
                ? "bg-blue-500/10"
                : status === "failed"
                  ? "bg-red-500/10"
                  : "bg-muted"
          )}
        >
          <AgentIcon
            className={cn(
              "w-4 h-4",
              status === "completed"
                ? "text-emerald-500"
                : status === "running"
                  ? "text-blue-500"
                  : status === "failed"
                    ? "text-red-500"
                    : "text-muted-foreground"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{agentConfig.name}</span>
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                statusConfig.dotColor,
                status === "running" && "animate-pulse-dot"
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {agentConfig.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <StatusIcon
              className={cn(
                "w-4 h-4",
                statusConfig.color,
                status === "running" && "animate-spin"
              )}
            />
            <span className={cn("text-xs font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
          {isClickable && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Log output */}
      {expanded && (
        <div
          ref={logRef}
          className="agent-log p-4 overflow-y-auto h-48 bg-secondary/20 text-foreground/80"
        >
          {logContent || (
            <span className="text-muted-foreground/50 italic">
              Waiting to start...
            </span>
          )}
        </div>
      )}

      {/* Question input (if waiting for input) */}
      {agent?.currentQuestion && (
        <div className="p-4 border-t bg-purple-500/5">
          <p className="text-sm font-medium mb-3">
            {agent.currentQuestion.question}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="Your answer..."
            />
            <button className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors">
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
