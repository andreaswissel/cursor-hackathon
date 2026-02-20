import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AgentState, FlowArtifactType } from "@product-os/shared";
import { cn } from "@/lib/utils";
import { createFlowArtifact, createFlowSession } from "@/lib/api";
import { isTauri } from "@/lib/platform";
import {
  Loader2,
  Sparkles,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  Terminal,
  Check,
  Copy,
} from "lucide-react";

interface CodingHandoffProps {
  sourceSessionId: string;
  ideaTitle: string;
  projectId?: string;
  codingPrompt?: string;
  spec?: string;
  productUpdate?: string;
  slidesUrl?: string;
  discoveryOutput?: AgentState["output"];
  strategyOutput?: AgentState["output"];
  gtmOutput?: AgentState["output"];
  onTerminalOpen: (command: string, cwd?: string) => void;
}

interface FlowSeedArtifact {
  type: FlowArtifactType;
  title: string;
  content: string;
}

function buildConcisePrompt(ideaTitle: string, codingPrompt?: string): string {
  const prompt = codingPrompt?.trim();
  if (prompt) return prompt;

  return `Build "${ideaTitle}" end-to-end.

Use the attached product artifacts to scope implementation.
Ship a minimal production-ready version with clear acceptance checks.
If anything is ambiguous, ask focused clarifying questions first.`;
}

function formatAgentOutput(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === "string") {
    const trimmed = output.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof output !== "object") return null;

  const data = output as Record<string, unknown>;

  if (typeof data.reasoning === "string" && data.reasoning.trim()) {
    return data.reasoning.trim();
  }

  const problemValidation = data.problemValidation as Record<string, unknown> | undefined;
  if (problemValidation && typeof problemValidation.reasoning === "string" && problemValidation.reasoning.trim()) {
    return problemValidation.reasoning.trim();
  }

  if (Array.isArray(data.slides)) {
    const slides = data.slides
      .map((slide) => {
        if (!slide || typeof slide !== "object") return null;
        const s = slide as Record<string, unknown>;
        if (typeof s.title !== "string") return null;
        const bullets = Array.isArray(s.bullets)
          ? s.bullets.filter((bullet): bullet is string => typeof bullet === "string")
          : [];
        return `## ${s.title}\n${bullets.map((bullet) => `- ${bullet}`).join("\n")}`;
      })
      .filter((slide): slide is string => Boolean(slide));

    if (slides.length > 0) {
      return slides.join("\n\n");
    }
  }

  return `\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``;
}

function buildSeedArtifacts(input: {
  ideaTitle: string;
  concisePrompt: string;
  spec?: string;
  discoveryOutput?: AgentState["output"];
  strategyOutput?: AgentState["output"];
  gtmOutput?: AgentState["output"];
  productUpdate?: string;
  slidesUrl?: string;
}): FlowSeedArtifact[] {
  const artifacts: FlowSeedArtifact[] = [
    {
      type: "plan",
      title: "Implementation Brief",
      content: input.concisePrompt,
    },
  ];

  if (input.spec?.trim()) {
    artifacts.push({
      type: "spec",
      title: `${input.ideaTitle} Spec`,
      content: input.spec,
    });
  }

  const discovery = formatAgentOutput(input.discoveryOutput);
  if (discovery) {
    artifacts.push({
      type: "discovery",
      title: "Discovery Insights",
      content: discovery,
    });
  }

  const strategy = formatAgentOutput(input.strategyOutput);
  if (strategy) {
    artifacts.push({
      type: "strategy",
      title: "Strategy Assessment",
      content: strategy,
    });
  }

  const gtm = formatAgentOutput(input.gtmOutput);
  if (gtm) {
    artifacts.push({
      type: "gtm",
      title: "GTM Plan",
      content: gtm,
    });
  }

  if (input.productUpdate?.trim()) {
    artifacts.push({
      type: "product-marketing",
      title: "Product Update Draft",
      content: input.productUpdate,
    });
  }

  if (input.slidesUrl?.trim()) {
    artifacts.push({
      type: "document",
      title: "Slides",
      content: `[Open generated slides](${input.slidesUrl})`,
    });
  }

  return artifacts;
}

function escapeCliPrompt(prompt: string): string {
  return prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export function CodingHandoff({
  sourceSessionId,
  ideaTitle,
  projectId,
  codingPrompt,
  spec,
  productUpdate,
  slidesUrl,
  discoveryOutput,
  strategyOutput,
  gtmOutput,
  onTerminalOpen,
}: CodingHandoffProps) {
  const navigate = useNavigate();
  const desktop = isTauri();

  const [isOpen, setIsOpen] = useState(false);
  const [isOpeningFlow, setIsOpeningFlow] = useState(false);
  const [copiedState, setCopiedState] = useState<"prompt" | "codex" | "cloud" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const concisePrompt = useMemo(
    () => buildConcisePrompt(ideaTitle, codingPrompt),
    [ideaTitle, codingPrompt]
  );

  const flowKickoffPrompt = useMemo(
    () =>
      `${concisePrompt}

Use the attached artifacts as source of truth. Start with a short implementation plan, then execute.`,
    [concisePrompt]
  );

  const handleOpenInFlowMode = async () => {
    if (isOpeningFlow) return;
    setIsOpeningFlow(true);
    setError(null);

    try {
      const { sessionId } = await createFlowSession(flowKickoffPrompt, projectId);

      const artifacts = buildSeedArtifacts({
        ideaTitle,
        concisePrompt,
        spec,
        discoveryOutput,
        strategyOutput,
        gtmOutput,
        productUpdate,
        slidesUrl,
      });

      for (const artifact of artifacts) {
        try {
          await createFlowArtifact(sessionId, {
            ...artifact,
            status: "ready",
            metadata: { sourceSessionId },
          });
        } catch (artifactError) {
          console.error("Failed to seed flow artifact:", artifactError);
        }
      }

      sessionStorage.setItem(`flow-pending-${sessionId}`, flowKickoffPrompt);
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open Flow mode");
      setIsOpeningFlow(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(concisePrompt);
    setCopiedState("prompt");
    setTimeout(() => setCopiedState(null), 2000);
  };

  const handleOpenCursor = () => {
    const deeplink = `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(concisePrompt)}`;
    window.location.href = deeplink;
    setIsOpen(false);
  };

  const handleCodex = () => {
    const command = `codex "${escapeCliPrompt(concisePrompt)}"`;
    if (desktop) {
      onTerminalOpen(command);
    } else {
      navigator.clipboard.writeText(command);
      setCopiedState("codex");
      setTimeout(() => setCopiedState(null), 2000);
    }
    setIsOpen(false);
  };

  const handleCloudCode = () => {
    const command = `claude "${escapeCliPrompt(concisePrompt)}"`;
    if (desktop) {
      onTerminalOpen(command);
    } else {
      navigator.clipboard.writeText(command);
      setCopiedState("cloud");
      setTimeout(() => setCopiedState(null), 2000);
    }
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <button
          onClick={handleOpenInFlowMode}
          disabled={isOpeningFlow}
          className="group relative overflow-hidden rounded-xl border border-violet-500/25 bg-card px-4 py-4 text-left transition-all hover:bg-violet-500/[0.08] hover:border-violet-400/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="relative flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              {isOpeningFlow ? (
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-violet-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                Recommended
              </p>
              <p className="mt-1 text-sm font-semibold">
                {isOpeningFlow ? "Opening Flow Mode..." : "Open in Flow Mode"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Seed artifacts automatically, then execute with a plan-first build flow.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-300/80 flex-shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        <div className={cn("relative", isOpen && "z-[120]")}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="group w-full h-full rounded-xl border bg-card px-4 py-4 text-left transition-all hover:border-violet-500/30 hover:bg-secondary/40"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Terminal className="w-4 h-4 text-violet-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Open in coding agent</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cursor, Codex, or Cloud Code with the concise build brief.
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform mt-1",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-[130] rounded-xl border bg-card shadow-lg overflow-hidden">
              <button
                onClick={handleOpenCursor}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Cursor</p>
                  <p className="text-xs text-muted-foreground">
                    Open Cursor with the concise build prompt
                  </p>
                </div>
              </button>

              <div className="border-t" />

              <button
                onClick={handleCodex}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <Terminal className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{copiedState === "codex" ? "Codex command copied" : "Codex"}</p>
                  <p className="text-xs text-muted-foreground">
                    {desktop ? "Run codex with the concise build prompt" : "Copy codex command"}
                  </p>
                </div>
              </button>

              <div className="border-t" />

              <button
                onClick={handleCloudCode}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <Terminal className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{copiedState === "cloud" ? "Cloud Code command copied" : "Cloud Code"}</p>
                  <p className="text-xs text-muted-foreground">
                    {desktop ? "Run cloud code with the concise build prompt" : "Copy cloud code command"}
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-3 py-2">
        <button
          onClick={handleCopyPrompt}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-violet-600 transition-colors"
        >
          {copiedState === "prompt" ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              Copied concise prompt
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy concise prompt
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground">
          Full docs are attached as Flow artifacts.
        </p>
      </div>
    </div>
  );
}
