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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-500" />
        </div>
        <div>
          <p className="text-sm font-medium">Ready for implementation</p>
          <p className="text-xs text-muted-foreground">
            Open in Flow Mode or hand off to a coding agent
          </p>
        </div>
      </div>

      <button
        onClick={handleOpenInFlowMode}
        disabled={isOpeningFlow}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isOpeningFlow ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Opening Flow Mode...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Open in Flow Mode
          </>
        )}
      </button>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-violet-500" />
            Open in coding agent
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-20 rounded-lg border bg-card shadow-lg overflow-hidden">
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

            <div className="border-t" />

            <button
              onClick={handleCopyPrompt}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              {copiedState === "prompt" ? (
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">{copiedState === "prompt" ? "Copied!" : "Copy concise prompt"}</p>
                <p className="text-xs text-muted-foreground">
                  Share the short implementation brief directly
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Handoffs use a concise build prompt. Full docs are attached as Flow artifacts.
      </p>
    </div>
  );
}
