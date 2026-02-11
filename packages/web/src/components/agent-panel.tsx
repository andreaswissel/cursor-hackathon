import { useEffect, useRef, useMemo, useState } from "react";
import type { AgentState, AgentType } from "@product-os/shared";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { answerQuestion } from "@/lib/api";
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
  Video,
  BookOpen,
} from "lucide-react";

interface AgentPanelProps {
  agent: AgentState | undefined;
  type: AgentType;
  sessionId?: string;
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
  "doc-orchestrator": {
    name: "Doc Orchestrator",
    description: "Coordinates documentation",
    icon: Compass,
  },
  transcription: {
    name: "Transcription",
    description: "Extracts video content",
    icon: Video,
  },
  "doc-generator": {
    name: "Doc Generator",
    description: "Creates documentation pieces",
    icon: BookOpen,
  },
  "flow-orchestrator": {
    name: "Flow Orchestrator",
    description: "Orchestrates flow conversations",
    icon: Compass,
  },
  "code-agent": {
    name: "Code Agent",
    description: "Implements features",
    icon: FileText,
  },
  "review-agent": {
    name: "Review Agent",
    description: "Reviews code",
    icon: CheckCircle2,
  },
  "changelog-agent": {
    name: "Changelog Agent",
    description: "Writes changelog entries",
    icon: FileText,
  },
  "guided-tours-agent": {
    name: "Guided Tours Agent",
    description: "Designs product tours",
    icon: FileText,
  },
  "feedback-forms-agent": {
    name: "Feedback Forms Agent",
    description: "Creates feedback forms",
    icon: FileText,
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

export function AgentPanel({ agent, type, sessionId, expanded = true, onClick }: AgentPanelProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerInput, setAnswerInput] = useState("");
  const agentConfig = AGENT_CONFIG[type];
  const status = agent?.status ?? "pending";
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const AgentIcon = agentConfig.icon;

  const handleAnswer = async (answer: string) => {
    if (!sessionId || !agent?.currentQuestion) return;
    setIsAnswering(true);
    try {
      await answerQuestion(sessionId, type, agent.currentQuestion.id, answer);
    } catch (error) {
      console.error("Failed to answer question:", error);
    }
    setIsAnswering(false);
    setAnswerInput("");
  };

  // Check if this is the strategy rejection question
  const isStrategyRejection = agent?.currentQuestion?.id === "strategy-rejection-proceed";

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [agent?.logs]);

  const logContent = agent?.logs.map((l) => l.content).join("") ?? "";

  // Get formatted output from agent.output (same logic as agent-detail-modal)
  const formattedOutput = useMemo(() => {
    if (!agent?.output) return null;

    if (typeof agent.output === "string") {
      return agent.output;
    }

    // Spec agent returns { markdown: string }
    if (typeof agent.output === "object" && "markdown" in (agent.output as object)) {
      return (agent.output as { markdown: string }).markdown;
    }

    // Other agents might have reasoning
    if (typeof agent.output === "object" && "reasoning" in (agent.output as object)) {
      return (agent.output as { reasoning: string }).reasoning;
    }

    // Check for problemValidation (discovery agent)
    if (typeof agent.output === "object" && "problemValidation" in (agent.output as object)) {
      const pv = (agent.output as { problemValidation: { reasoning?: string } }).problemValidation;
      if (pv?.reasoning) return pv.reasoning;
    }

    return null;
  }, [agent?.output]);

  // Show formatted output if available, otherwise show logs
  const displayContent = formattedOutput || logContent;
  const isMarkdown = !!formattedOutput;

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
          className={cn(
            "p-4 overflow-y-auto h-48 bg-secondary/20",
            isMarkdown ? [
              "prose prose-sm max-w-none",
              "prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-base prose-h2:text-sm prose-h3:text-sm",
              "prose-p:text-muted-foreground prose-p:text-sm prose-p:leading-relaxed prose-p:my-2",
              "prose-li:text-muted-foreground prose-li:text-sm prose-li:my-0.5",
              "prose-strong:text-foreground",
              "prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-2 prose-pre:overflow-x-auto",
              "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs [&_pre_code]:text-foreground/90"
            ].join(" ") : "agent-log text-foreground/80"
          )}
        >
          {displayContent ? (
            isMarkdown ? (
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            ) : (
              displayContent
            )
          ) : (
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
          {isStrategyRejection ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleAnswer("yes")}
                disabled={isAnswering}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isAnswering ? "Processing..." : "Yes, proceed anyway"}
              </button>
              <button
                onClick={() => handleAnswer("no")}
                disabled={isAnswering}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isAnswering ? "Processing..." : "No, stop here"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnswer(answerInput)}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                placeholder="Your answer..."
              />
              <button
                onClick={() => handleAnswer(answerInput)}
                disabled={isAnswering || !answerInput}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {isAnswering ? "..." : "Submit"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
