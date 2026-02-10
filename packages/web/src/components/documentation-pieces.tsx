import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DocumentationPiece, DocPieceType, DocPieceStatus } from "@product-os/shared";
import ReactMarkdown from "react-markdown";
import {
  Check,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  Sparkles,
  BookOpen,
  GitBranch,
  Lightbulb,
  GraduationCap,
  FileCode,
  Send,
} from "lucide-react";

interface DocumentationPiecesProps {
  pieces: DocumentationPiece[];
  onAccept: (pieceId: string) => Promise<void>;
  onDecline: (pieceId: string) => Promise<void>;
  onRefine: (pieceId: string, message: string) => Promise<void>;
  isRefining?: string; // pieceId currently being refined
}

const PIECE_TYPE_CONFIG: Record<
  DocPieceType,
  { icon: typeof BookOpen; color: string; label: string }
> = {
  feature: {
    icon: Sparkles,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    label: "Feature",
  },
  workflow: {
    icon: GitBranch,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    label: "Workflow",
  },
  "use-case": {
    icon: Lightbulb,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    label: "Use Case",
  },
  tutorial: {
    icon: GraduationCap,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    label: "Tutorial",
  },
  reference: {
    icon: FileCode,
    color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    label: "Reference",
  },
};

const STATUS_CONFIG: Record<DocPieceStatus, { color: string; label: string }> = {
  pending: { color: "bg-muted text-muted-foreground", label: "Pending" },
  accepted: { color: "bg-emerald-500/10 text-emerald-600", label: "Accepted" },
  declined: { color: "bg-red-500/10 text-red-600", label: "Declined" },
  refined: { color: "bg-blue-500/10 text-blue-600", label: "Refined" },
};

export function DocumentationPieces({
  pieces,
  onAccept,
  onDecline,
  onRefine,
  isRefining,
}: DocumentationPiecesProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refineInputs, setRefineInputs] = useState<Record<string, string>>({});
  const [showRefineFor, setShowRefineFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (piece: DocumentationPiece) => {
    await navigator.clipboard.writeText(piece.content);
    setCopiedId(piece.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAccept = async (pieceId: string) => {
    setActionLoading(pieceId);
    try {
      await onAccept(pieceId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (pieceId: string) => {
    setActionLoading(pieceId);
    try {
      await onDecline(pieceId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefineSubmit = async (pieceId: string) => {
    const message = refineInputs[pieceId]?.trim();
    if (!message) return;

    await onRefine(pieceId, message);
    setRefineInputs((prev) => ({ ...prev, [pieceId]: "" }));
    setShowRefineFor(null);
  };

  if (pieces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No documentation yet</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Documentation pieces will appear here once the video has been processed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pieces.map((piece) => {
        const typeConfig = PIECE_TYPE_CONFIG[piece.pieceType];
        const statusConfig = STATUS_CONFIG[piece.status];
        const Icon = typeConfig.icon;
        const isExpanded = expandedIds.has(piece.id);
        const isCurrentlyRefining = isRefining === piece.id;

        return (
          <div
            key={piece.id}
            className={cn(
              "rounded-xl border bg-card overflow-hidden transition-all",
              piece.status === "declined" && "opacity-60"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    typeConfig.color.split(" ")[0]
                  )}
                >
                  <Icon className={cn("w-5 h-5", typeConfig.color.split(" ")[1])} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{piece.title}</p>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium border",
                        typeConfig.color
                      )}
                    >
                      {typeConfig.label}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        statusConfig.color
                      )}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  {piece.refinementHistory.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {piece.refinementHistory.length} refinement
                      {piece.refinementHistory.length !== 1 && "s"}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {piece.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleAccept(piece.id)}
                      disabled={!!actionLoading}
                      className={cn(
                        "p-2 rounded-lg hover:bg-emerald-500/10 transition-colors",
                        "text-emerald-600 hover:text-emerald-700"
                      )}
                      title="Accept"
                    >
                      {actionLoading === piece.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDecline(piece.id)}
                      disabled={!!actionLoading}
                      className={cn(
                        "p-2 rounded-lg hover:bg-red-500/10 transition-colors",
                        "text-red-600 hover:text-red-700"
                      )}
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() =>
                    setShowRefineFor(showRefineFor === piece.id ? null : piece.id)
                  }
                  disabled={isCurrentlyRefining}
                  className={cn(
                    "p-2 rounded-lg hover:bg-secondary transition-colors",
                    showRefineFor === piece.id && "bg-secondary"
                  )}
                  title="Refine"
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleCopy(piece)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedId === piece.id ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => toggleExpanded(piece.id)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Refine input */}
            {showRefineFor === piece.id && (
              <div className="px-5 py-3 border-b bg-secondary/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refineInputs[piece.id] || ""}
                    onChange={(e) =>
                      setRefineInputs((prev) => ({
                        ...prev,
                        [piece.id]: e.target.value,
                      }))
                    }
                    placeholder="Describe what changes you'd like..."
                    className="flex-1 px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isCurrentlyRefining}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleRefineSubmit(piece.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleRefineSubmit(piece.id)}
                    disabled={
                      isCurrentlyRefining || !refineInputs[piece.id]?.trim()
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium",
                      "hover:bg-primary/90 transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isCurrentlyRefining ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Content (always show preview, expand for full) */}
            <div
              className={cn(
                "px-5 py-4 overflow-hidden transition-all",
                isExpanded ? "max-h-[2000px]" : "max-h-[150px]"
              )}
            >
              <div
                className={cn(
                  "prose prose-sm max-w-none",
                  "prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight",
                  "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
                  "prose-p:text-muted-foreground prose-li:text-muted-foreground",
                  "prose-strong:text-foreground",
                  "prose-code:text-xs prose-code:bg-muted prose-code:text-foreground",
                  "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono",
                  "prose-code:before:content-none prose-code:after:content-none",
                  "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
                  "prose-pre:rounded-lg prose-pre:p-3 prose-pre:overflow-x-auto",
                  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground/90"
                )}
              >
                <ReactMarkdown>{piece.content}</ReactMarkdown>
              </div>
            </div>

            {/* Expand prompt */}
            {!isExpanded && (
              <button
                onClick={() => toggleExpanded(piece.id)}
                className="w-full px-5 py-2 border-t bg-gradient-to-t from-background to-transparent text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Click to expand
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
