import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FlowArtifact } from "@product-os/shared";
import ReactMarkdown from "react-markdown";
import {
  ClipboardList,
  GitBranch,
  ShieldCheck,
  FileText,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  ChevronRight,
  Package,
} from "lucide-react";

const DEFAULT_TYPE_CONFIG = { icon: FileText, color: "text-muted-foreground", label: "Artifact" };

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  plan: { icon: ClipboardList, color: "text-blue-500", label: "Plan" },
  "code-diff": { icon: GitBranch, color: "text-emerald-500", label: "Code" },
  review: { icon: ShieldCheck, color: "text-amber-500", label: "Review" },
  spec: { icon: FileText, color: "text-purple-500", label: "Spec" },
  document: { icon: BookOpen, color: "text-cyan-500", label: "Document" },
  "pr-link": { icon: ExternalLink, color: "text-orange-500", label: "PR Link" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG;
}

interface FlowArtifactPanelProps {
  artifacts: FlowArtifact[];
  className?: string;
}

export function FlowArtifactPanel({ artifacts, className }: FlowArtifactPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const selectedArtifact = artifacts.find((a) => a.id === selectedId);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Expanded artifact view
  if (selectedArtifact) {
    const config = getTypeConfig(selectedArtifact.type);
    const Icon = config.icon;

    return (
      <div className={cn("flex flex-col h-full border-l bg-card", className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSelectedId(null)}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
            <span className="text-sm font-medium truncate">{selectedArtifact.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCopy(selectedArtifact.id, selectedArtifact.content)}
              className="p-1.5 rounded hover:bg-secondary transition-colors"
              title="Copy content"
            >
              {copied === selectedArtifact.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => setSelectedId(null)}
              className="p-1.5 rounded hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedArtifact.status === "generating" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </div>
          ) : selectedArtifact.type === "code-diff" ? (
            <DiffViewer content={selectedArtifact.content} />
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
              <ReactMarkdown>{selectedArtifact.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className={cn("flex flex-col h-full border-l bg-card", className)}>
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Artifacts</span>
          {artifacts.length > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              {artifacts.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {artifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-xs text-muted-foreground">
              Artifacts will appear here as the assistant creates them during conversation.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {artifacts.map((artifact) => {
              const config = getTypeConfig(artifact.type);
              const Icon = config.icon;

              return (
                <button
                  key={artifact.id}
                  onClick={() => setSelectedId(artifact.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      "bg-secondary"
                    )}
                  >
                    {artifact.status === "generating" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Icon className={cn("w-4 h-4", config.color)} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{artifact.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{config.label}</span>
                      {artifact.status === "generating" && (
                        <span className="text-xs text-amber-500">Generating...</span>
                      )}
                      {artifact.status === "error" && (
                        <span className="text-xs text-red-500">Error</span>
                      )}
                      {artifact.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(artifact.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffViewer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <pre className="text-xs font-mono overflow-x-auto">
      {lines.map((line, i) => {
        let className = "block px-2 py-px whitespace-pre ";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          className += "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          className += "bg-red-500/10 text-red-600 dark:text-red-400";
        } else if (line.startsWith("@@")) {
          className += "bg-blue-500/10 text-blue-600 dark:text-blue-400";
        } else if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
          className += "text-muted-foreground font-semibold";
        } else {
          className += "text-muted-foreground";
        }
        return (
          <span key={i} className={className}>
            {line}
          </span>
        );
      })}
    </pre>
  );
}
