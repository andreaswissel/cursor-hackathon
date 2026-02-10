import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { KnowledgeSourceForm } from "@/components/knowledge-source-form";
import {
  getProjectKnowledge,
  createKnowledgeSource,
  updateKnowledgeSource,
  deleteKnowledgeSource,
  resolveProjectKnowledge,
  summarizeKnowledgeSource,
  getAllProjects,
  type IntegrationDataItem,
} from "@/lib/api";
import type { KnowledgeSource, KnowledgeFilter, KnowledgeVisibility, ProjectWithSessions } from "@product-os/shared";
import { cn } from "@/lib/utils";
import {
  Plus,
  BookOpen,
  Trash2,
  Pencil,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Users,
  Target,
  MessageSquare,
  Ticket,
  FileText,
  Hash,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

const DATA_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  okrs: { label: "OKRs", color: "bg-blue-500/10 text-blue-500" },
  feedback: { label: "Feedback", color: "bg-emerald-500/10 text-emerald-500" },
  tickets: { label: "Tickets", color: "bg-purple-500/10 text-purple-500" },
  docs: { label: "Docs", color: "bg-amber-500/10 text-amber-500" },
  messages: { label: "Messages", color: "bg-pink-500/10 text-pink-500" },
};

const PROVIDER_BADGES: Record<string, string> = {
  airtable: "bg-green-500/10 text-green-600",
  jira: "bg-blue-500/10 text-blue-600",
  notion: "bg-gray-500/10 text-gray-600",
  google: "bg-red-500/10 text-red-500",
  slack: "bg-purple-500/10 text-purple-600",
};

export function ProjectKnowledgePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [previewItems, setPreviewItems] = useState<IntegrationDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const project = projects.find(p => p.id === projectId);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [knowledgeRes, projectsRes] = await Promise.all([
        getProjectKnowledge(projectId),
        getAllProjects(),
      ]);
      setSources(knowledgeRes.sources);
      setProjects(projectsRes.projects);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadPreview = useCallback(async () => {
    if (!projectId) return;
    setPreviewLoading(true);
    try {
      const res = await resolveProjectKnowledge(projectId);
      setPreviewItems(res.items);
    } catch {
      // Preview is best-effort
    } finally {
      setPreviewLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (sources.length > 0) loadPreview();
  }, [sources.length, loadPreview]);

  const handleCreate = async (data: {
    name: string;
    description?: string;
    provider?: string;
    dataTypes?: string[];
    filters: KnowledgeFilter;
    visibility: KnowledgeVisibility;
  }) => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      await createKnowledgeSource(projectId, data);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: {
    name: string;
    description?: string;
    provider?: string;
    dataTypes?: string[];
    filters: KnowledgeFilter;
    visibility: KnowledgeVisibility;
  }) => {
    if (!projectId || !editingSource) return;
    setIsSubmitting(true);
    try {
      await updateKnowledgeSource(projectId, editingSource.id, data);
      setEditingSource(null);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!projectId) return;
    try {
      await deleteKnowledgeSource(projectId, id);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggle = async (source: KnowledgeSource) => {
    if (!projectId) return;
    try {
      await updateKnowledgeSource(projectId, source.id, { enabled: !source.enabled });
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSummarize = async (id: string) => {
    if (!projectId) return;
    setSummarizingId(id);
    try {
      await summarizeKnowledgeSource(projectId, id);
      await loadData();
      setExpandedSummaries(prev => new Set([...prev, id]));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSummarizingId(null);
    }
  };

  const toggleSummary = (id: string) => {
    setExpandedSummaries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getFilterSummary = (source: KnowledgeSource): string[] => {
    const parts: string[] = [];
    const f = source.filters;
    if (f.keywords?.length) parts.push(`Keywords: ${f.keywords.join(", ")}`);
    if (f.channels?.length) parts.push(`Channels: ${f.channels.join(", ")}`);
    if (f.sourceIds?.length) parts.push(`${f.sourceIds.length} source IDs`);
    if (f.integrationDataIds?.length) parts.push(`${f.integrationDataIds.length} specific items`);
    return parts;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar projects={projects} />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile spacer */}
        <div className="h-14 md:hidden" />

        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to projects
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Knowledge Sources</h1>
                  <p className="text-sm text-muted-foreground">
                    {project?.name || "Project"} — configure data filters for sessions
                  </p>
                </div>
              </div>
              {!showForm && !editingSource && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Source
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          {/* Add Form */}
          {showForm && (
            <div className="mb-6">
              <KnowledgeSourceForm
                onSubmit={handleCreate}
                onCancel={() => setShowForm(false)}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {/* Edit Form */}
          {editingSource && (
            <div className="mb-6">
              <KnowledgeSourceForm
                initialData={editingSource}
                onSubmit={handleUpdate}
                onCancel={() => setEditingSource(null)}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && sources.length === 0 && !showForm && (
            <div className="py-16 text-center border border-dashed rounded-xl">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-medium mb-1">No knowledge sources yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add filters to scope integration data to this project. Sessions will inherit project knowledge automatically.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Knowledge Source
              </button>
            </div>
          )}

          {/* Sources List */}
          {!isLoading && sources.length > 0 && !editingSource && (
            <div className="space-y-4 mb-8">
              {sources.map(source => (
                <div
                  key={source.id}
                  className={cn(
                    "rounded-xl border bg-card transition-opacity",
                    !source.enabled && "opacity-60"
                  )}
                >
                  <div className="p-5">
                    {/* Top row: name + actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{source.name}</h3>
                          {source.visibility === "private" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600">
                              <Lock className="w-2.5 h-2.5" />
                              Private
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600">
                              <Users className="w-2.5 h-2.5" />
                              Team
                            </span>
                          )}
                        </div>
                        {source.description && (
                          <p className="text-xs text-muted-foreground">{source.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(source)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            source.enabled
                              ? "text-emerald-500 hover:bg-emerald-500/10"
                              : "text-muted-foreground hover:bg-secondary"
                          )}
                          title={source.enabled ? "Disable" : "Enable"}
                        >
                          {source.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingSource(source)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSummarize(source.id)}
                          disabled={summarizingId === source.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                          title="Summarize with AI"
                        >
                          {summarizingId === source.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Badges row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {source.provider && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium capitalize",
                          PROVIDER_BADGES[source.provider] || "bg-gray-500/10 text-gray-500"
                        )}>
                          {source.provider}
                        </span>
                      )}
                      {source.dataTypes?.map(dt => (
                        <span
                          key={dt}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium",
                            DATA_TYPE_BADGES[dt]?.color || "bg-gray-500/10 text-gray-500"
                          )}
                        >
                          {DATA_TYPE_BADGES[dt]?.label || dt}
                        </span>
                      ))}
                    </div>

                    {/* Filter summary */}
                    {getFilterSummary(source).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getFilterSummary(source).map((part, i) => (
                          <span key={i} className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                            {part}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* AI Summary */}
                    {source.aiSummary && (
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => toggleSummary(source.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expandedSummaries.has(source.id) ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          <Sparkles className="w-3 h-3" />
                          AI Summary
                          {source.aiSummaryGeneratedAt && (
                            <span className="text-muted-foreground/60 font-normal ml-1">
                              {new Date(source.aiSummaryGeneratedAt).toLocaleDateString()}
                            </span>
                          )}
                        </button>
                        {expandedSummaries.has(source.id) && (
                          <div className="mt-2 space-y-2">
                            <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap">
                              {source.aiSummary}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-muted-foreground/60">
                                Summary will be included as context in new sessions
                              </p>
                              <button
                                onClick={() => handleSummarize(source.id)}
                                disabled={summarizingId === source.id}
                                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                              >
                                {summarizingId === source.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                Regenerate
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No summary yet — show hint */}
                    {!source.aiSummary && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-[10px] text-muted-foreground/60">
                          Click <Sparkles className="w-2.5 h-2.5 inline" /> to generate an AI summary. Uses your configured LLM provider.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview Section */}
          {!isLoading && sources.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">
                  Matched Data Preview
                  {!previewLoading && (
                    <span className="text-muted-foreground font-normal ml-2">
                      {previewItems.length} items
                    </span>
                  )}
                </h2>
                <button
                  onClick={loadPreview}
                  disabled={previewLoading}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {previewLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Refresh
                </button>
              </div>

              {previewLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!previewLoading && previewItems.length === 0 && (
                <div className="py-8 text-center border border-dashed rounded-xl">
                  <p className="text-sm text-muted-foreground">No matching items found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Adjust your filters or sync more data in Settings
                  </p>
                </div>
              )}

              {!previewLoading && previewItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {previewItems.slice(0, 12).map(item => (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-card p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.title || item.sourceName || "Untitled"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.provider} · {item.dataType}
                          </p>
                        </div>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
                          DATA_TYPE_BADGES[item.dataType]?.color || "bg-gray-500/10 text-gray-500"
                        )}>
                          {DATA_TYPE_BADGES[item.dataType]?.label || item.dataType}
                        </span>
                      </div>
                      {item.summary && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{item.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!previewLoading && previewItems.length > 12 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Showing 12 of {previewItems.length} matched items
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
