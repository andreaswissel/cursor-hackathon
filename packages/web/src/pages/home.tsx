import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSession, getAllSessions, type SessionSummary } from "@/lib/api";
import { MOCK_OKRS, MOCK_CUSTOMER_FEEDBACK } from "@product-os/shared";
import { Sidebar } from "@/components/sidebar";
import { Zap, ArrowRight, Target, MessageSquare } from "lucide-react";

export function HomePage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState(
    "Add AI-powered semantic search to our B2B analytics dashboard"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    getAllSessions()
      .then(({ sessions }) => setSessions(sessions))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setIsLoading(true);
    try {
      const { sessionId } = await createSession(idea, {
        okrs: MOCK_OKRS,
        customerFeedback: MOCK_CUSTOMER_FEEDBACK,
      });
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar sessions={sessions} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-16">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-4">
              <Zap className="w-3.5 h-3.5" />
              Agentic Product Management
            </div>
            <h1 className="text-4xl font-semibold tracking-tight mb-3">
              From idea to spec in minutes
            </h1>
            <p className="text-lg text-muted-foreground">
              AI agents validate, strategize, and spec your product ideas
              against real customer feedback and OKRs.
            </p>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="rounded-xl border bg-card p-1">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your product idea..."
                className="w-full min-h-[140px] px-4 py-3 text-base bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
              />
              <div className="flex items-center justify-between px-3 py-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Press Enter to submit
                </span>
                <button
                  type="submit"
                  disabled={isLoading || !idea.trim()}
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

          {/* Context cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* OKRs Card */}
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">OKRs</h3>
                  <p className="text-xs text-muted-foreground">
                    Demo context loaded
                  </p>
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
                  <li
                    key={i}
                    className="text-sm text-muted-foreground line-clamp-1"
                  >
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
        </div>
      </main>
    </div>
  );
}
