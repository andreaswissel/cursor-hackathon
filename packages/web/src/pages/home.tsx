import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createSession, createDocumentationSession, getAllProjects, getUsageStats, getDiscoveryDashboard, triggerDiscoveryRun, getDiscoveryRunStatus, type UsageStats } from "@/lib/api";
import { MOCK_OKRS, MOCK_CUSTOMER_FEEDBACK, MOCK_INTERNAL_FEEDBACK, MOCK_METRICS, type SessionMode, type DiscoveryCluster, type DiscoveryRun, type ProjectWithSessions } from "@product-os/shared";
import { Sidebar } from "@/components/sidebar";
import { DataSourceSelector } from "@/components/data-source-selector";
import { ModeSwitcher } from "@/components/mode-switcher";
import { VideoUpload } from "@/components/video-upload";
import { DiscoveryCard } from "@/components/discovery-card";
import { Zap, ArrowRight, AlertCircle, Compass, Play, Loader2, Info, Clock } from "lucide-react";

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<SessionMode>("idea-to-spec");
  const [idea, setIdea] = useState(
    "Add AI-powered semantic search to our B2B analytics dashboard"
  );
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<{
    okrs: Array<{ objective: string; keyResults: string[] }>;
    customerFeedback: string[];
    internalFeedback?: Array<{ channel: string; author: string; message: string }>;
    metrics?: Array<{ name: string; value: string; trend: string; delta: string; source: string; description: string }>;
  }>({
    okrs: MOCK_OKRS,
    customerFeedback: MOCK_CUSTOMER_FEEDBACK,
    internalFeedback: MOCK_INTERNAL_FEEDBACK,
    metrics: MOCK_METRICS,
  });

  // Discovery state
  const [clusters, setClusters] = useState<DiscoveryCluster[]>([]);
  const [discoveryRun, setDiscoveryRun] = useState<DiscoveryRun | null>(null);
  const [isMockData, setIsMockData] = useState(true);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
  const [isDiscoveryRunning, setIsDiscoveryRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleContextChange = useCallback((newContext: typeof context) => {
    setContext(newContext);
  }, []);

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);

    getUsageStats()
      .then((stats) => setUsageStats(stats))
      .catch(console.error);
  };

  const loadDiscoveryDashboard = useCallback(async () => {
    setIsDiscoveryLoading(true);
    try {
      const data = await getDiscoveryDashboard();
      setClusters(data.clusters);
      setDiscoveryRun(data.run);
      setIsMockData(data.isMockData);
      if (data.run?.status === "running" || data.run?.status === "pending") {
        setIsDiscoveryRunning(true);
        startDiscoveryPolling(data.run.id);
      } else {
        setIsDiscoveryRunning(false);
      }
    } catch {
      // Silently fail — discovery is optional
    } finally {
      setIsDiscoveryLoading(false);
    }
  }, []);

  const startDiscoveryPolling = useCallback((runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getDiscoveryRunStatus(runId);
        if (status.status === "completed" || status.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setIsDiscoveryRunning(false);
          const data = await getDiscoveryDashboard();
          setClusters(data.clusters);
          setDiscoveryRun(data.run);
          setIsMockData(data.isMockData);
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);
  }, []);

  const handleRunAnalysis = async () => {
    setIsDiscoveryRunning(true);
    try {
      const { runId } = await triggerDiscoveryRun();
      startDiscoveryPolling(runId);
    } catch {
      setIsDiscoveryRunning(false);
    }
  };

  const handleStartSessionFromCluster = (cluster: DiscoveryCluster) => {
    const signals = [
      ...cluster.sampleSignals,
      ...cluster.moneyQuotes.map((q) => `[Money Quote] ${q}`),
    ];
    setIdea(cluster.featureSuggestion);
    setContext((prev) => ({
      ...prev,
      customerFeedback: signals,
    }));
    setMode("idea-to-spec");
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    refreshProjects();
    loadDiscoveryDashboard();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadDiscoveryDashboard]);

  // Handle navigation state from /discover page
  useEffect(() => {
    const state = location.state as { cluster?: DiscoveryCluster } | null;
    if (state?.cluster) {
      handleStartSessionFromCluster(state.cluster);
      // Clear the navigation state
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usageStats && !usageStats.canCreateSession) return;

    if (mode === "idea-to-spec") {
      if (!idea.trim()) return;

      setIsLoading(true);
      setError(null);
      try {
        const { sessionId } = await createSession(idea, context);
        navigate(`/session/${sessionId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create session";
        setError(message);
        setIsLoading(false);
      }
    } else {
      // Documentation mode
      if (!description.trim() || !videoFile) return;

      setIsLoading(true);
      setError(null);
      try {
        const { sessionId } = await createDocumentationSession(description, videoFile);
        navigate(`/session/${sessionId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create documentation session";
        setError(message);
        setIsLoading(false);
      }
    }
  };

  const canSubmit = mode === "idea-to-spec"
    ? idea.trim().length > 0
    : description.trim().length > 0 && videoFile !== null;

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects} onProjectCreated={refreshProjects} onProjectDeleted={refreshProjects} onSessionDeleted={refreshProjects} />

      <main className="flex-1 overflow-y-auto">
        {/* Add top padding on mobile for fixed header */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-4">
              <Zap className="w-3.5 h-3.5" />
              Agentic Product Management
            </div>
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight mb-3">
              {mode === "idea-to-spec"
                ? "From idea to spec in minutes"
                : mode === "documentation"
                  ? "Video to documentation"
                  : "Discover opportunities"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {mode === "idea-to-spec"
                ? "AI agents validate, strategize, and spec your product ideas against real customer feedback and OKRs."
                : mode === "documentation"
                  ? "Upload a video and let AI generate structured documentation pieces you can review and refine."
                  : "AI-ranked opportunities from your customer signals. Find what to build next."}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="mb-8">
            <ModeSwitcher mode={mode} onModeChange={setMode} disabled={isLoading} />
          </div>

          {/* Session limit warning */}
          {usageStats && !usageStats.canCreateSession && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600">Session limit reached</p>
                <p className="text-sm text-amber-600/80 mt-1">
                  You've used all {usageStats.maxSessions} sessions for this demo.
                  Please continue with an existing session.
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Input form — idea-to-spec and documentation modes */}
          {mode !== "discover" && (
            <form onSubmit={handleSubmit} className="mb-12">
              {mode === "idea-to-spec" ? (
                // Idea to Spec mode
                <>
                  <div className="rounded-xl border bg-card p-1">
                    <textarea
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Describe your product idea..."
                      className="w-full min-h-[140px] px-4 py-3 text-base bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
                      disabled={isLoading || (usageStats !== null && !usageStats.canCreateSession)}
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {usageStats ? `${usageStats.sessionCount}/${usageStats.maxSessions === null ? "unlimited" : usageStats.maxSessions} sessions used` : "Press Enter to submit"}
                      </span>
                      <button
                        type="submit"
                        disabled={isLoading || !canSubmit || (usageStats !== null && !usageStats.canCreateSession)}
                        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? (
                          "Starting..."
                        ) : (
                          <>
                            Launch Agents
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Do not upload sensitive personal data unless your workspace is explicitly configured for it.{" "}
                    <a href="/restricted-data" className="underline hover:text-foreground transition-colors">
                      Restricted data examples
                    </a>
                  </p>
                </>
              ) : (
                // Documentation mode
                <div className="space-y-4">
                  <VideoUpload
                    onFileSelect={setVideoFile}
                    selectedFile={videoFile}
                    disabled={isLoading || (usageStats !== null && !usageStats.canCreateSession)}
                  />
                  <div className="rounded-xl border bg-card p-1">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this video demonstrates (e.g., 'Walkthrough of user onboarding flow')..."
                      className="w-full min-h-[100px] px-4 py-3 text-base bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
                      disabled={isLoading || (usageStats !== null && !usageStats.canCreateSession)}
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {usageStats ? `${usageStats.sessionCount}/${usageStats.maxSessions === null ? "unlimited" : usageStats.maxSessions} sessions used` : "Add a description for context"}
                      </span>
                      <button
                        type="submit"
                        disabled={isLoading || !canSubmit || (usageStats !== null && !usageStats.canCreateSession)}
                        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? (
                          "Processing..."
                        ) : (
                          <>
                            Generate Documentation
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Only include details you are authorized to share.{" "}
                    <a href="/restricted-data" className="underline hover:text-foreground transition-colors">
                      Restricted data examples
                    </a>
                  </p>
                </div>
              )}
            </form>
          )}

          {/* Discovery mode content */}
          {mode === "discover" && (
            <div className="mb-12">
              {/* Run Analysis header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {discoveryRun?.completedAt && !isMockData && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Last run {formatTimestamp(discoveryRun.completedAt)}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isDiscoveryRunning}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDiscoveryRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>

              {/* Mock data banner */}
              {isMockData && !isDiscoveryLoading && (
                <div className="mb-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-600">Sample data</p>
                    <p className="text-sm text-blue-600/80 mt-0.5">
                      This is sample data based on mock feedback. Connect your tools
                      in Settings and run an analysis to see real insights.
                    </p>
                  </div>
                </div>
              )}

              {/* Running state */}
              {isDiscoveryRunning && (
                <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Analyzing your signals...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This usually takes 15-30 seconds. Results will appear automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {isDiscoveryLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Cluster cards grid */}
              {!isDiscoveryLoading && clusters.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {clusters.map((cluster, index) => (
                    <DiscoveryCard
                      key={cluster.id}
                      cluster={cluster}
                      rank={index + 1}
                      onStartSession={handleStartSessionFromCluster}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isDiscoveryLoading && clusters.length === 0 && (
                <div className="text-center py-16">
                  <Compass className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="text-lg font-medium mb-2">No insights yet</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect your tools in Settings and run an analysis to discover opportunities.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Data Source Selector - only shown for idea-to-spec mode */}
          {mode === "idea-to-spec" && (
            <DataSourceSelector onContextChange={handleContextChange} />
          )}
        </div>
      </main>
    </div>
  );
}
