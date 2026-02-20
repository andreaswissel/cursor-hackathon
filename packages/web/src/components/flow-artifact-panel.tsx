import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { FlowArtifact } from "@product-os/shared";
import ReactMarkdown from "react-markdown";
import { buildArtifactHandleMap } from "@/lib/flow-artifact-utils";
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
  ScrollText,
  Search,
  Target,
  Megaphone,
  Newspaper,
  CircleDot,
  Sparkles,
  BadgeCheck,
} from "lucide-react";

const DEFAULT_TYPE_CONFIG = { icon: FileText, color: "text-muted-foreground", label: "Artifact" };

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  plan: { icon: ClipboardList, color: "text-blue-500", label: "Plan" },
  "code-diff": { icon: GitBranch, color: "text-emerald-500", label: "Code" },
  review: { icon: ShieldCheck, color: "text-amber-500", label: "Review" },
  spec: { icon: FileText, color: "text-purple-500", label: "Spec" },
  document: { icon: BookOpen, color: "text-cyan-500", label: "Document" },
  "pr-link": { icon: ExternalLink, color: "text-orange-500", label: "PR Link" },
  changelog: { icon: ScrollText, color: "text-rose-500", label: "Changelog" },
  discovery: { icon: Search, color: "text-indigo-500", label: "Discovery" },
  strategy: { icon: Target, color: "text-teal-500", label: "Strategy" },
  gtm: { icon: Megaphone, color: "text-yellow-500", label: "GTM" },
  "product-marketing": { icon: Newspaper, color: "text-pink-500", label: "Marketing" },
  "guided-tour": { icon: ScrollText, color: "text-cyan-500", label: "Tour" },
  "feedback-form": { icon: ClipboardList, color: "text-violet-500", label: "Feedback Form" },
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
  const artifactHandles = useMemo(() => buildArtifactHandleMap(artifacts), [artifacts]);

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
    const handle = artifactHandles[selectedArtifact.id] ?? `artifact-${selectedArtifact.id.slice(0, 8)}`;

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
            <div className="min-w-0">
              <span className="text-sm font-medium truncate block">{selectedArtifact.title}</span>
              <span className="text-[11px] text-muted-foreground font-mono">@{handle}</span>
            </div>
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
          ) : (
            <ArtifactContent artifact={selectedArtifact} />
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
              const handle = artifactHandles[artifact.id] ?? `artifact-${artifact.id.slice(0, 8)}`;

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
                    <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                      @{handle}
                    </p>
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

function ArtifactContent({ artifact }: { artifact: FlowArtifact }) {
  const structuredContent = useMemo(() => parseStructuredContent(artifact.content), [artifact.content]);

  if (artifact.type === "code-diff") {
    return <DiffViewer content={artifact.content} />;
  }

  if (artifact.status === "error") {
    return <ErrorArtifactView content={artifact.content} />;
  }

  if (artifact.type === "discovery" && structuredContent) {
    return <DiscoveryArtifactView data={structuredContent} />;
  }

  if (artifact.type === "strategy" && structuredContent) {
    return <StrategyArtifactView data={structuredContent} />;
  }

  if (artifact.type === "spec" && structuredContent) {
    return <SpecArtifactView data={structuredContent} rawContent={artifact.content} />;
  }

  if (artifact.type === "gtm" && structuredContent) {
    return <GTMArtifactView data={structuredContent} />;
  }

  if (artifact.type === "product-marketing" && structuredContent) {
    return <ProductMarketingArtifactView data={structuredContent} />;
  }

  if (structuredContent) {
    return <StructuredDataView data={structuredContent} />;
  }

  return <MarkdownContent content={artifact.content} />;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function ErrorArtifactView({ content }: { content: string }) {
  const parsed = useMemo(() => parseErrorArtifactContent(content), [content]);

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <X className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-red-500">Agent Failed</h3>
        </div>
        {parsed.summary && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsed.summary}</p>
        )}
        {parsed.helpUrl && (
          <a
            href={parsed.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-500 hover:text-blue-400"
          >
            Open related docs
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </section>

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b bg-secondary/40">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Error Payload
          </span>
        </div>
        <pre className="text-xs font-mono text-foreground/90 p-3 overflow-x-auto bg-muted/25 whitespace-pre">
          <code>{parsed.prettyPayload || content}</code>
        </pre>
      </section>
    </div>
  );
}

function DiscoveryArtifactView({ data }: { data: unknown }) {
  const obj = asRecord(data);
  if (!obj) return <StructuredDataView data={data} />;

  const problemValidation = asRecord(obj.problemValidation);
  const customerInsights = asRecord(obj.customerInsights);
  const marketSignals = asRecord(obj.marketSignals);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-gradient-to-br from-indigo-500/10 via-card to-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <BadgeCheck className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold">Problem Validation</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusPill
            label={String(problemValidation?.isValid ? "Valid" : "Not Valid")}
            tone={problemValidation?.isValid ? "green" : "amber"}
          />
          <StatusPill
            label={`Confidence: ${String(problemValidation?.confidence ?? "unknown")}`}
            tone="blue"
          />
        </div>
        <MarkdownContent content={asString(problemValidation?.reasoning) ?? ""} />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">Customer Insights</h3>
        </div>
        <KeyValueList title="Pain Points" items={asStringArray(customerInsights?.painPoints)} />
        <KeyValueList title="Desired Outcomes" items={asStringArray(customerInsights?.desiredOutcomes)} />
        <QuoteList title="Quotes" items={asStringArray(customerInsights?.quotes)} />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-semibold">Market Signals</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={`Demand: ${String(marketSignals?.demand ?? "unknown")}`} tone="teal" />
          <StatusPill label={`Urgency: ${String(marketSignals?.urgency ?? "unknown")}`} tone="amber" />
        </div>
        <KeyValueList title="Evidence" items={asStringArray(marketSignals?.evidence)} />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Recommendations</h3>
        <KeyValueList items={asStringArray(obj.recommendations)} />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Risks</h3>
        <KeyValueList items={asStringArray(obj.risks)} />
      </section>
    </div>
  );
}

function StrategyArtifactView({ data }: { data: unknown }) {
  const obj = asRecord(data);
  if (!obj) return <StructuredDataView data={data} />;

  const okrAlignment = asRecord(obj.okrAlignment);
  const priorityScore = asRecord(obj.priorityScore);
  const strategicFit = asRecord(obj.strategicFit);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-gradient-to-br from-teal-500/10 via-card to-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-semibold">Strategy Summary</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill label={`OKR Alignment: ${asNumber(okrAlignment?.score) ?? "n/a"}/100`} tone="teal" />
          <StatusPill label={`Priority: ${asNumber(priorityScore?.overall) ?? "n/a"}/100`} tone="blue" />
          <StatusPill label={`Decision: ${String(obj.recommendation ?? "unknown")}`} tone="amber" />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Priority Breakdown</h3>
        <MetricRow label="Impact" value={asNumber(priorityScore?.impact)} />
        <MetricRow label="Effort" value={asNumber(priorityScore?.effort)} />
        <MetricRow label="Confidence" value={asNumber(priorityScore?.confidence)} />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Strategic Fit</h3>
        <StatusPill label={String(strategicFit?.assessment ?? "unknown")} tone="green" />
        <MarkdownContent content={asString(strategicFit?.reasoning) ?? asString(obj.reasoning) ?? ""} />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Tradeoffs</h3>
        <KeyValueList items={asStringArray(obj.tradeoffs)} />
      </section>
    </div>
  );
}

function SpecArtifactView({ data, rawContent }: { data: unknown; rawContent: string }) {
  const obj = asRecord(data);
  const markdown = asString(obj?.markdown);
  if (markdown) return <MarkdownContent content={markdown} />;
  return <MarkdownContent content={rawContent} />;
}

function GTMArtifactView({ data }: { data: unknown }) {
  const obj = asRecord(data);
  if (!obj) return <StructuredDataView data={data} />;

  const slides = asArray(obj.slides);
  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-gradient-to-br from-yellow-500/10 via-card to-card p-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold">{asString(obj.title) || "Go-To-Market Plan"}</h3>
        </div>
      </section>

      {slides.length === 0 ? (
        <StructuredDataView data={data} />
      ) : (
        slides.map((slide, index) => {
          const slideObj = asRecord(slide);
          const bullets = asStringArray(slideObj?.bullets);
          return (
            <section key={index} className="rounded-xl border bg-card p-4 space-y-2">
              <h4 className="text-sm font-semibold">
                {index + 1}. {asString(slideObj?.title) || "Untitled Slide"}
              </h4>
              <KeyValueList items={bullets} />
              {asString(slideObj?.speakerNotes) && (
                <div className="rounded-lg bg-secondary/50 border border-border/60 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Speaker Notes</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {asString(slideObj?.speakerNotes)}
                  </p>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function ProductMarketingArtifactView({ data }: { data: unknown }) {
  const obj = asRecord(data);
  if (!obj) return <StructuredDataView data={data} />;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-gradient-to-br from-pink-500/10 via-card to-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-pink-500" />
          <h3 className="text-sm font-semibold">{asString(obj.title) || "Product Update"}</h3>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{asString(obj.summary)}</p>
      </section>

      <SectionBlock title="Problem Statement" content={asString(obj.problemStatement)} />
      <SectionBlock title="Solution" content={asString(obj.solution)} />
      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h4 className="text-sm font-semibold">Key Benefits</h4>
        <KeyValueList items={asStringArray(obj.keyBenefits)} />
      </section>
      <SectionBlock title="OKR Alignment" content={asString(obj.okrAlignment)} />
      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h4 className="text-sm font-semibold">Success Metrics</h4>
        <KeyValueList items={asStringArray(obj.successMetrics)} />
      </section>
      <SectionBlock title="Timeline" content={asString(obj.timeline)} />
      <SectionBlock title="Call To Action" content={asString(obj.callToAction)} />
    </div>
  );
}

function StructuredDataView({ data }: { data: unknown }) {
  const obj = asRecord(data);
  if (!obj) {
    return (
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words rounded-xl border bg-muted/30 p-3">
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(obj).map(([key, value]) => (
        <section key={key} className="rounded-xl border bg-card p-4 space-y-2">
          <h4 className="text-sm font-semibold">{formatKey(key)}</h4>
          <StructuredValue value={value} />
        </section>
      ))}
    </div>
  );
}

function StructuredValue({ value }: { value: unknown }) {
  if (typeof value === "string") {
    if (looksLikeMarkdown(value)) {
      return <MarkdownContent content={value} />;
    }
    return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm text-muted-foreground">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    const primitiveValues = value.filter((item) => ["string", "number", "boolean"].includes(typeof item));
    if (primitiveValues.length === value.length) {
      return <KeyValueList items={primitiveValues.map((item) => String(item))} />;
    }
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border bg-secondary/30 p-3">
            <StructuredValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (asRecord(value)) {
    return <StructuredDataView data={value} />;
  }

  return (
    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function SectionBlock({ title, content }: { title: string; content?: string }) {
  if (!content) return null;
  return (
    <section className="rounded-xl border bg-card p-4 space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
    </section>
  );
}

function KeyValueList({ title, items = [] }: { title?: string; items?: string[] }) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>}
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-foreground/60 mt-[3px]">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuoteList({ title, items = [] }: { title?: string; items?: string[] }) {
  if (items.length === 0) return <KeyValueList title={title} items={items} />;
  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <blockquote key={index} className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
            {item}
          </blockquote>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "amber" | "blue" | "teal" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : tone === "teal"
      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
      : "bg-blue-500/10 text-blue-600 dark:text-blue-400";

  return <span className={cn("text-xs px-2 py-1 rounded-full", toneClass)}>{label}</span>;
}

function MetricRow({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{clamped}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-foreground/70 rounded-full" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function parseStructuredContent(content: string): unknown | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Continue with fenced JSON parsing
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]) as unknown;
    } catch {
      return null;
    }
  }

  return null;
}

function parseErrorArtifactContent(content: string): {
  summary: string;
  prettyPayload: string | null;
  helpUrl: string | null;
} {
  const trimmed = content.trim();
  const helpUrlMatch = trimmed.match(/https?:\/\/[^\s)]+/i);
  const helpUrl = helpUrlMatch?.[0] ?? null;

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybeJson = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(maybeJson) as unknown;
      const parsedObj = asRecord(parsed);
      const apiMessage = asString(asRecord(parsedObj?.error)?.message);
      const prefix = trimmed
        .slice(0, firstBrace)
        .trim()
        .replace(/[:\-]\s*$/, "");
      return {
        summary: prefix || apiMessage || "The agent returned an error response.",
        prettyPayload: JSON.stringify(parsed, null, 2),
        helpUrl,
      };
    } catch {
      // Not valid JSON; fall through to raw view.
    }
  }

  return {
    summary: trimmed,
    prettyPayload: null,
    helpUrl,
  };
}

function looksLikeMarkdown(value: string): boolean {
  return /(^#|\n#|\n- |\n\* |\*\*|`{3}|^\d+\. )/m.test(value);
}

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
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
