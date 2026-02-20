import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle, ChevronRight, Square } from "lucide-react";

interface CollapsibleThinkingProps {
  agentType: string;
  agentLabel: string;
  logs: string[];
  status: "running" | "completed" | "failed";
  startedAt?: string;
  onStop?: () => void;
}

export function CollapsibleThinking({
  agentLabel,
  logs,
  status,
  startedAt,
  onStop,
}: CollapsibleThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [now, setNow] = useState(Date.now());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-collapse when status changes to completed/failed
  useEffect(() => {
    if (status === "completed" || status === "failed") {
      setIsExpanded(false);
    }
  }, [status]);

  // Auto-scroll logs
  useEffect(() => {
    if (isExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isExpanded]);

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const startedLabel = useMemo(() => {
    if (!startedAt) return null;
    const date = new Date(startedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [startedAt]);

  const elapsedLabel = useMemo(() => {
    if (!startedAt || status !== "running") return null;
    const started = new Date(startedAt).getTime();
    if (Number.isNaN(started)) return null;
    const elapsedSeconds = Math.max(0, Math.floor((now - started) / 1000));
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, [startedAt, status, now]);

  const statusIcon =
    status === "running" ? (
      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
    ) : status === "completed" ? (
      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <XCircle className="w-3.5 h-3.5 text-red-500" />
    );

  const statusText =
    status === "running"
      ? `${agentLabel} thinking...`
      : status === "completed"
      ? `${agentLabel} completed`
      : `${agentLabel} failed`;

  return (
    <div className="rounded-xl border bg-secondary/30 overflow-hidden max-w-[85%]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 transition-colors"
      >
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )}
        />
        {statusIcon}
        <span className="text-xs font-medium text-muted-foreground flex-1">
          {statusText}
        </span>
        {startedLabel && (
          <span className="text-[10px] text-muted-foreground/80 tabular-nums">
            {elapsedLabel ? `${elapsedLabel} • ` : ""}{startedLabel}
          </span>
        )}
        {status === "running" && onStop && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            role="button"
            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title="Stop running agent"
          >
            <Square className="w-3 h-3 fill-current" />
          </span>
        )}
      </button>

      {/* Collapsible body */}
      {isExpanded && (
        <div className="border-t max-h-60 overflow-y-auto scrollbar-subtle px-3 py-2 bg-muted/30">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
            {logs.join("")}
          </pre>
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
