import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createSession, getAllSessions, getUsageStats, type SessionSummary, type UsageStats } from "@/lib/api";
import { MOCK_OKRS, MOCK_CUSTOMER_FEEDBACK, MOCK_INTERNAL_FEEDBACK, MOCK_METRICS } from "@product-os/shared";
import { Sidebar } from "@/components/sidebar";
import { DataSourceSelector } from "@/components/data-source-selector";
import { Zap, ArrowRight, AlertCircle } from "lucide-react";

export function HomePage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState(
    "Add AI-powered semantic search to our B2B analytics dashboard"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
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

  const handleContextChange = useCallback((newContext: typeof context) => {
    setContext(newContext);
  }, []);

  const refreshSessions = () => {
    getAllSessions()
      .then(({ sessions }) => setSessions(sessions))
      .catch(console.error);

    getUsageStats()
      .then((stats) => setUsageStats(stats))
      .catch(console.error);
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    if (usageStats && !usageStats.canCreateSession) return;

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
  };

  return (
    <div className="flex h-screen">
      <Sidebar sessions={sessions} onSessionDeleted={refreshSessions} />

      <main className="flex-1 overflow-y-auto">
        {/* Add top padding on mobile for fixed header */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-4">
              <Zap className="w-3.5 h-3.5" />
              Agentic Product Management
            </div>
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight mb-3">
              From idea to spec in minutes
            </h1>
            <p className="text-lg text-muted-foreground">
              AI agents validate, strategize, and spec your product ideas
              against real customer feedback and OKRs.
            </p>
          </div>

          {/* Session limit warning */}
          {usageStats && !usageStats.canCreateSession && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600">Session limit reached</p>
                <p className="text-sm text-amber-600/80 mt-1">
                  You've used your {usageStats.maxSessions} session for this demo.
                  Please continue with your existing session.
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

          {/* Input form */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="rounded-xl border bg-card p-1">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your product idea..."
                className="w-full min-h-[140px] px-4 py-3 text-base bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
                disabled={usageStats !== null && !usageStats.canCreateSession}
              />
              <div className="flex items-center justify-between px-3 py-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {usageStats ? `${usageStats.sessionCount}/${usageStats.maxSessions} sessions used` : "Press Enter to submit"}
                </span>
                <button
                  type="submit"
                  disabled={isLoading || !idea.trim() || (usageStats !== null && !usageStats.canCreateSession)}
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
          </form>

          {/* Data Source Selector */}
          <DataSourceSelector onContextChange={handleContextChange} />
        </div>
      </main>
    </div>
  );
}
