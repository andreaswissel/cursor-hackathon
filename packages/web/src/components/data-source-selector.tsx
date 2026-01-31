import { useState, useEffect } from "react";
import { getIntegrationData, type IntegrationDataItem } from "@/lib/api";
import { MOCK_OKRS, MOCK_CUSTOMER_FEEDBACK } from "@product-os/shared";
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
} from "lucide-react";

interface DataSourceSelectorProps {
  onContextChange: (context: {
    okrs: Array<{ objective: string; keyResults: string[] }>;
    customerFeedback: string[];
  }) => void;
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

export function DataSourceSelector({ onContextChange }: DataSourceSelectorProps) {
  const [useMockData, setUseMockData] = useState(true);
  const [integrationData, setIntegrationData] = useState<IntegrationDataItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch integration data on mount
  useEffect(() => {
    fetchIntegrationData();
  }, []);

  // Update context when selection or mode changes
  useEffect(() => {
    if (useMockData) {
      onContextChange({
        okrs: MOCK_OKRS,
        customerFeedback: MOCK_CUSTOMER_FEEDBACK,
      });
    } else {
      // Convert selected integration data to context format
      const selectedData = integrationData.filter((d) => selectedIds.has(d.id));

      // Extract OKRs
      const okrs: Array<{ objective: string; keyResults: string[] }> = [];
      const feedback: string[] = [];

      for (const item of selectedData) {
        if (item.dataType === "okrs" && Array.isArray(item.content)) {
          // Try to parse OKR format from content
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
          // Extract feedback strings
          for (const record of item.content as Array<Record<string, unknown>>) {
            const text = record.Feedback || record.feedback || record.Comment || record.comment || record.Text || record.text;
            if (text) {
              feedback.push(String(text));
            }
          }
        } else if (item.dataType === "tickets" && Array.isArray(item.content)) {
          // Treat ticket summaries as feedback
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
  }, [useMockData, selectedIds, integrationData, onContextChange]);

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

  const hasIntegrationData = integrationData.length > 0;

  return (
    <div className="space-y-4">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Table className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Data Source</h3>
            <p className="text-xs text-muted-foreground">
              {useMockData ? "Using demo data" : "Using live integrations"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setUseMockData(!useMockData)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            useMockData
              ? "bg-secondary text-muted-foreground"
              : "bg-primary text-primary-foreground"
          )}
          disabled={!hasIntegrationData && !useMockData}
        >
          {useMockData ? (
            <>
              <ToggleLeft className="w-4 h-4" />
              Demo
            </>
          ) : (
            <>
              <ToggleRight className="w-4 h-4" />
              Live
            </>
          )}
        </button>
      </div>

      {/* Content based on mode */}
      {useMockData ? (
        // Mock Data Display
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
        </div>
      ) : (
        // Live Integration Data
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
