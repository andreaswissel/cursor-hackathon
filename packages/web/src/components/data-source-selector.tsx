import { useState, useEffect } from "react";
import { getIntegrationData, getProjectKnowledge, resolveProjectKnowledge, type IntegrationDataItem } from "@/lib/api";
import { MOCK_OKRS, MOCK_CUSTOMER_FEEDBACK, MOCK_INTERNAL_FEEDBACK, MOCK_METRICS } from "@product-os/shared";
import type { KnowledgeSource } from "@product-os/shared";
import { cn } from "@/lib/utils";
import {
  Target,
  MessageSquare,
  Ticket,
  FileText,
  Table,
  ToggleLeft,
  ToggleRight,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  Hash,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Eye,
  EyeOff,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

interface DataSourceSelectorProps {
  projectId?: string;
  onContextChange: (context: {
    okrs: Array<{ objective: string; keyResults: string[] }>;
    customerFeedback: string[];
    internalFeedback?: Array<{ channel: string; author: string; message: string }>;
    metrics?: Array<{ name: string; value: string; trend: string; delta: string; source: string; description: string }>;
  }) => void;
  /** If true, skip sending context (let the backend resolve from knowledge) */
  onUseProjectKnowledge?: (useIt: boolean) => void;
}

const DATA_TYPE_ICONS: Record<string, typeof Target> = {
  okrs: Target,
  feedback: MessageSquare,
  tickets: Ticket,
  docs: FileText,
  messages: MessageSquare,
};

const DATA_TYPE_COLORS: Record<string, string> = {
  okrs: "bg-blue-500/10 text-blue-500",
  feedback: "bg-emerald-500/10 text-emerald-500",
  tickets: "bg-purple-500/10 text-purple-500",
  docs: "bg-amber-500/10 text-amber-500",
  messages: "bg-pink-500/10 text-pink-500",
};

// Generate a preview of the content
function getContentPreview(item: IntegrationDataItem): string[] {
  const previews: string[] = [];

  if (!item.content || !Array.isArray(item.content)) {
    if (typeof item.content === "string") {
      // For docs/text content, show first 100 chars
      return [item.content.slice(0, 100) + (item.content.length > 100 ? "..." : "")];
    }
    return [];
  }

  // Take first 3 records
  const records = (item.content as Array<Record<string, unknown>>).slice(0, 3);

  for (const record of records) {
    // Try to find the most meaningful field to preview
    const previewField =
      record.Objective || record.objective ||
      record.Name || record.name ||
      record.Title || record.title ||
      record.Summary || record.summary ||
      record.Feedback || record.feedback ||
      record.Comment || record.comment ||
      record.Text || record.text ||
      record.Description || record.description ||
      Object.values(record).find(v => typeof v === "string" && v.length > 0);

    if (previewField) {
      const text = String(previewField);
      previews.push(text.slice(0, 80) + (text.length > 80 ? "..." : ""));
    }
  }

  return previews;
}

type DataMode = "mock" | "knowledge" | "live";

export function DataSourceSelector({ projectId, onContextChange, onUseProjectKnowledge }: DataSourceSelectorProps) {
  const [mode, setMode] = useState<DataMode>("mock");
  const [integrationData, setIntegrationData] = useState<IntegrationDataItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Knowledge mode state
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<IntegrationDataItem[]>([]);
  const [disabledSourceIds, setDisabledSourceIds] = useState<Set<string>>(new Set());
  const [hasProjectKnowledge, setHasProjectKnowledge] = useState(false);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);

  // Check for project knowledge on mount
  useEffect(() => {
    if (projectId) {
      loadProjectKnowledge();
    }
  }, [projectId]);

  // Fetch integration data on mount
  useEffect(() => {
    fetchIntegrationData();
  }, []);

  // Auto-switch to knowledge mode if project has sources
  useEffect(() => {
    if (hasProjectKnowledge && mode === "mock") {
      setMode("knowledge");
    }
  }, [hasProjectKnowledge]);

  // Update context when selection or mode changes
  useEffect(() => {
    if (mode === "mock") {
      onUseProjectKnowledge?.(false);
      onContextChange({
        okrs: MOCK_OKRS,
        customerFeedback: MOCK_CUSTOMER_FEEDBACK,
        internalFeedback: MOCK_INTERNAL_FEEDBACK,
        metrics: MOCK_METRICS,
      });
    } else if (mode === "knowledge") {
      // Signal to parent that backend should resolve context from project knowledge
      onUseProjectKnowledge?.(true);
      // Still pass a minimal context — the backend will resolve the real one
      onContextChange({ okrs: [], customerFeedback: [] });
    } else {
      onUseProjectKnowledge?.(false);
      // Convert selected integration data to context format
      const selectedData = integrationData.filter((d) => selectedIds.has(d.id));

      // Extract OKRs
      const okrs: Array<{ objective: string; keyResults: string[] }> = [];
      const feedback: string[] = [];

      for (const item of selectedData) {
        if (item.dataType === "okrs" && Array.isArray(item.content)) {
          for (const record of item.content as Array<Record<string, unknown>>) {
            const objective = record.Objective || record.objective || record.Name || record.name;
            const keyResults = record["Key Results"] || record.keyResults || record.KRs || [];
            if (objective) {
              okrs.push({
                objective: String(objective),
                keyResults: Array.isArray(keyResults) ? keyResults.map(String) : [String(keyResults)],
              });
            }
          }
        } else if (item.dataType === "feedback" && Array.isArray(item.content)) {
          for (const record of item.content as Array<Record<string, unknown>>) {
            const text = record.Feedback || record.feedback || record.Comment || record.comment || record.Text || record.text;
            if (text) {
              feedback.push(String(text));
            }
          }
        } else if (item.dataType === "tickets" && Array.isArray(item.content)) {
          for (const record of item.content as Array<Record<string, unknown>>) {
            const summary = record.Summary || record.summary || record.Title || record.title;
            if (summary) {
              feedback.push(String(summary));
            }
          }
        }
      }

      onContextChange({
        okrs: okrs.length > 0 ? okrs : MOCK_OKRS,
        customerFeedback: feedback.length > 0 ? feedback : MOCK_CUSTOMER_FEEDBACK,
      });
    }
  }, [mode, selectedIds, integrationData, onContextChange]);

  const loadProjectKnowledge = async () => {
    if (!projectId) return;
    setKnowledgeLoading(true);
    try {
      const [knowledgeRes, resolveRes] = await Promise.all([
        getProjectKnowledge(projectId),
        resolveProjectKnowledge(projectId),
      ]);
      const enabledSources = knowledgeRes.sources.filter(s => s.enabled);
      setKnowledgeSources(enabledSources);
      setKnowledgeItems(resolveRes.items);
      setHasProjectKnowledge(enabledSources.length > 0);
    } catch {
      // No knowledge configured — that's fine
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const fetchIntegrationData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getIntegrationData();
      setIntegrationData(data);
      // Auto-select all by default
      setSelectedIds(new Set(data.map((d) => d.id)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSourceDisabled = (sourceId: string) => {
    setDisabledSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  };

  const cycleMode = () => {
    if (mode === "mock") {
      setMode(hasProjectKnowledge ? "knowledge" : "live");
    } else if (mode === "knowledge") {
      setMode("live");
    } else {
      setMode("mock");
    }
  };

  const getModeLabel = () => {
    if (mode === "mock") return "Demo";
    if (mode === "knowledge") return "Project";
    return "Live";
  };

  const getModeDescription = () => {
    if (mode === "mock") return "Using demo data";
    if (mode === "knowledge") return "Using project knowledge";
    return "Using live integrations";
  };

  return (
    <div className="space-y-4">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            {mode === "knowledge" ? (
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Table className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm">Data Source</h3>
            <p className="text-xs text-muted-foreground">
              {getModeDescription()}
            </p>
          </div>
        </div>
        <button
          onClick={cycleMode}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            mode === "mock"
              ? "bg-secondary text-muted-foreground"
              : mode === "knowledge"
              ? "bg-primary/10 text-primary"
              : "bg-primary text-primary-foreground"
          )}
        >
          {mode === "mock" ? (
            <>
              <ToggleLeft className="w-4 h-4" />
              Demo
            </>
          ) : mode === "knowledge" ? (
            <>
              <BookOpen className="w-4 h-4" />
              Project
            </>
          ) : (
            <>
              <ToggleRight className="w-4 h-4" />
              Live
            </>
          )}
        </button>
      </div>

      {/* Knowledge Mode */}
      {mode === "knowledge" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Project Knowledge Sources
            </h3>
            {projectId && (
              <Link
                to={`/project/${projectId}/knowledge`}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <LinkIcon className="w-3 h-3" />
                Configure
              </Link>
            )}
          </div>

          {knowledgeLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!knowledgeLoading && knowledgeSources.length === 0 && (
            <div className="p-6 rounded-xl border border-dashed text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                No knowledge sources configured
              </p>
              <p className="text-xs text-muted-foreground/60 mb-3">
                Add knowledge sources to this project to filter data automatically
              </p>
              {projectId && (
                <Link
                  to={`/project/${projectId}/knowledge`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Configure Knowledge
                </Link>
              )}
            </div>
          )}

          {!knowledgeLoading && knowledgeSources.length > 0 && (
            <>
              {/* Knowledge source cards */}
              <div className="space-y-2">
                {knowledgeSources.map(source => (
                  <div
                    key={source.id}
                    className={cn(
                      "rounded-lg border p-3 transition-opacity",
                      disabledSourceIds.has(source.id) && "opacity-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.provider ? `${source.provider} · ` : ""}
                          {source.dataTypes?.join(", ") || "All types"}
                          {source.filters.keywords?.length
                            ? ` · ${source.filters.keywords.length} keywords`
                            : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSourceDisabled(source.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          disabledSourceIds.has(source.id)
                            ? "text-muted-foreground hover:bg-secondary"
                            : "text-emerald-500 hover:bg-emerald-500/10"
                        )}
                        title={disabledSourceIds.has(source.id) ? "Enable" : "Disable for this session"}
                      >
                        {disabledSourceIds.has(source.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Matched items count */}
              <p className="text-xs text-muted-foreground text-center">
                {knowledgeItems.length} items matched from {knowledgeSources.length - disabledSourceIds.size} active sources
              </p>
            </>
          )}
        </div>
      )}

      {/* Mock Data Mode */}
      {mode === "mock" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OKRs Card */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-sm">OKRs</h3>
                <p className="text-xs text-muted-foreground">Demo context</p>
              </div>
            </div>
            <ul className="space-y-3">
              {MOCK_OKRS.map((okr, i) => (
                <li key={i}>
                  <p className="text-sm font-medium">{okr.objective}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {okr.keyResults.join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Feedback Card */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Customer Feedback</h3>
                <p className="text-xs text-muted-foreground">
                  {MOCK_CUSTOMER_FEEDBACK.length} entries
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {MOCK_CUSTOMER_FEEDBACK.slice(0, 4).map((feedback, i) => (
                <li key={i} className="text-sm text-muted-foreground line-clamp-1">
                  "{feedback}"
                </li>
              ))}
              {MOCK_CUSTOMER_FEEDBACK.length > 4 && (
                <li className="text-xs text-muted-foreground/60">
                  +{MOCK_CUSTOMER_FEEDBACK.length - 4} more entries
                </li>
              )}
            </ul>
          </div>

          {/* Internal Feedback Card */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Hash className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Internal Feedback</h3>
                <p className="text-xs text-muted-foreground">
                  {MOCK_INTERNAL_FEEDBACK.length} Slack messages
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {MOCK_INTERNAL_FEEDBACK.slice(0, 3).map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  <span className="text-purple-500 text-xs font-medium">{item.channel}</span>
                  <span className="line-clamp-1 block">"{item.message.slice(0, 60)}..."</span>
                </li>
              ))}
              {MOCK_INTERNAL_FEEDBACK.length > 3 && (
                <li className="text-xs text-muted-foreground/60">
                  +{MOCK_INTERNAL_FEEDBACK.length - 3} more messages
                </li>
              )}
            </ul>
          </div>

          {/* Metrics Card */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Product Metrics</h3>
                <p className="text-xs text-muted-foreground">
                  {MOCK_METRICS.length} key metrics
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {MOCK_METRICS.slice(0, 4).map((metric, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate mr-2">{metric.name}</span>
                  <span className="flex items-center gap-1 font-medium">
                    {metric.value}
                    {metric.trend === "up" && <TrendingUp className="w-3 h-3 text-red-500" />}
                    {metric.trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                    {metric.trend === "flat" && <Minus className="w-3 h-3 text-muted-foreground" />}
                  </span>
                </li>
              ))}
              {MOCK_METRICS.length > 4 && (
                <li className="text-xs text-muted-foreground/60">
                  +{MOCK_METRICS.length - 4} more metrics
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Live Integration Data Mode */}
      {mode === "live" && (
        <div className="space-y-3">
          {/* Header with refresh */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Select data sources
            </h3>
            <button
              onClick={fetchIntegrationData}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* No data */}
          {!isLoading && integrationData.length === 0 && (
            <div className="p-6 rounded-xl border border-dashed text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No integration data found
              </p>
              <p className="text-xs text-muted-foreground/60">
                Connect and sync integrations in Settings to use live data
              </p>
            </div>
          )}

          {/* Data sources grid */}
          {!isLoading && integrationData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {integrationData.map((item) => {
                const Icon = DATA_TYPE_ICONS[item.dataType] || FileText;
                const colorClass = DATA_TYPE_COLORS[item.dataType] || "bg-gray-500/10 text-gray-500";
                const isSelected = selectedIds.has(item.id);
                const previews = getContentPreview(item);

                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            colorClass.split(" ")[0]
                          )}
                        >
                          <Icon className={cn("w-4 h-4", colorClass.split(" ")[1])} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {item.title || item.sourceName || "Untitled"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.provider} · {item.dataType}
                            {item.summary && ` · ${item.summary}`}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </div>
                    {/* Content Preview */}
                    {previews.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                        {previews.map((preview, i) => (
                          <p
                            key={i}
                            className="text-xs text-muted-foreground line-clamp-1"
                          >
                            {preview}
                          </p>
                        ))}
                        {Array.isArray(item.content) && (item.content as unknown[]).length > 3 && (
                          <p className="text-xs text-muted-foreground/60">
                            +{(item.content as unknown[]).length - 3} more rows
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selection summary */}
          {!isLoading && integrationData.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {selectedIds.size} of {integrationData.length} sources selected
            </p>
          )}
        </div>
      )}
    </div>
  );
}
