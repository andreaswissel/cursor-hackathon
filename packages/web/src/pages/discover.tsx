import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { DiscoveryCard } from "@/components/discovery-card";
import { DataSourceSelector } from "@/components/data-source-selector";
import {
  getDiscoveryDashboard,
  triggerDiscoveryRun,
  getDiscoveryRunStatus,
  getAllProjects,
} from "@/lib/api";
import type { DiscoveryCluster, DiscoveryRun, ProjectWithSessions } from "@product-os/shared";
import { MOCK_OKRS, MOCK_CUSTOMER_FEEDBACK, MOCK_INTERNAL_FEEDBACK, MOCK_METRICS } from "@product-os/shared";
import { Compass, Play, Loader2, Info, Clock } from "lucide-react";

export function DiscoverPage() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<DiscoveryCluster[]>([]);
  const [run, setRun] = useState<DiscoveryRun | null>(null);
  const [isMockData, setIsMockData] = useState(true);
  const [isDemoData, setIsDemoData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const handleContextChange = useCallback((newContext: typeof context) => {
    setContext(newContext);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDiscoveryDashboard();
      setClusters(data.clusters);
      setRun(data.run);
      setIsMockData(data.isMockData);
      setIsDemoData(data.isDemoData ?? false);

      // If a run is currently in progress, start polling
      if (data.run?.status === "running" || data.run?.status === "pending") {
        setIsRunning(true);
        startPolling(data.run.id);
      } else {
        setIsRunning(false);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startPolling = useCallback((runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const status = await getDiscoveryRunStatus(runId);
        if (status.status === "completed" || status.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setIsRunning(false);
          // Reload dashboard to get fresh clusters
          const data = await getDiscoveryDashboard();
          setClusters(data.clusters);
          setRun(data.run);
          setIsMockData(data.isMockData);
          setIsDemoData(data.isDemoData ?? false);
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);
  }, []);

  useEffect(() => {
    loadDashboard();
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadDashboard]);

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const { runId } = await triggerDiscoveryRun(context);
      startPolling(runId);
    } catch (err) {
      setError((err as Error).message);
      setIsRunning(false);
    }
  };

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);
  };

  const handleStartSession = (cluster: DiscoveryCluster) => {
    navigate("/imagine", { state: { cluster } });
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

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects} onProjectCreated={refreshProjects} onProjectDeleted={refreshProjects} onSessionDeleted={refreshProjects} />

      <main className="flex-1 overflow-y-auto">
        {/* Add top padding on mobile for fixed header */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 pt-20 md:pt-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-3">
                <Compass className="w-3.5 h-3.5" />
                Signal Intelligence
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Discovery
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-ranked opportunities from your customer signals
              </p>
            </div>

            <div className="flex items-center gap-3">
              {run?.completedAt && !isMockData && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Last run {formatTimestamp(run.completedAt)}
                </span>
              )}
              <button
                onClick={handleRunAnalysis}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? (
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
          </div>

          {/* Sample / demo data banners */}
          {isMockData && !isDemoData && !isLoading && (
            <div className="mb-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Sample data
                </p>
                <p className="text-sm text-blue-600/80 mt-0.5">
                  This is sample data based on mock feedback. Select a data
                  source below and run an analysis to see real insights.
                </p>
              </div>
            </div>
          )}
          {isDemoData && !isMockData && !isLoading && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Analysis based on sample data
                </p>
                <p className="text-sm text-amber-600/80 mt-0.5">
                  Connect and sync integrations in Settings for real signals, or
                  switch to Live mode below.
                </p>
              </div>
            </div>
          )}

          {/* Running state overlay */}
          {isRunning && (
            <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  Analyzing your signals...
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This usually takes 15-30 seconds. Results will appear
                  automatically.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Cluster cards grid */}
          {!isLoading && clusters.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {clusters.map((cluster, index) => (
                <DiscoveryCard
                  key={cluster.id}
                  cluster={cluster}
                  rank={index + 1}
                  onStartSession={handleStartSession}
                />
              ))}
            </div>
          )}

          {/* Empty state (no mock data either — shouldn't normally happen) */}
          {!isLoading && clusters.length === 0 && !error && (
            <div className="text-center py-16">
              <Compass className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">No insights yet</h2>
              <p className="text-sm text-muted-foreground">
                Connect your tools in Settings and run an analysis to discover
                opportunities.
              </p>
            </div>
          )}

          {/* Data Source Selector */}
          {!isLoading && (
            <div className="mt-8">
              <DataSourceSelector onContextChange={handleContextChange} />
            </div>
          )}

          {/* Stats footer */}
          {!isLoading && run && !isMockData && (
            <div className="mt-8 pt-6 border-t flex items-center gap-6 text-xs text-muted-foreground">
              <span>
                {run.signalCount} signals analyzed
              </span>
              <span>
                {run.clusterCount} clusters identified
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
