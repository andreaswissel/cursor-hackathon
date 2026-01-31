import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/button";
import { createSession } from "@/lib/api";
import { MOCK_OKRS, MOCK_CUSTOMER_FEEDBACK } from "@product-os/shared";

export function HomePage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState(
    "Add AI-powered semantic search to our B2B analytics dashboard"
  );
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Product OS</h1>
          <p className="text-muted-foreground">
            From idea to spec in minutes. Powered by agentic AI.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="idea" className="text-sm font-medium">
              What's your product idea?
            </label>
            <textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your product idea..."
              className="w-full min-h-[120px] rounded-lg border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Starting..." : "Launch Product OS"}
          </Button>
        </form>

        {/* Context preview */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h2 className="text-sm font-medium">Demo Context (Pre-loaded)</h2>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              OKRs
            </h3>
            <ul className="text-sm space-y-1">
              {MOCK_OKRS.map((okr, i) => (
                <li key={i}>
                  <span className="font-medium">{okr.objective}:</span>{" "}
                  {okr.keyResults.join(", ")}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customer Feedback ({MOCK_CUSTOMER_FEEDBACK.length} entries)
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {MOCK_CUSTOMER_FEEDBACK.slice(0, 3).map((feedback, i) => (
                <li key={i} className="truncate">
                  "{feedback}"
                </li>
              ))}
              {MOCK_CUSTOMER_FEEDBACK.length > 3 && (
                <li className="text-xs">
                  +{MOCK_CUSTOMER_FEEDBACK.length - 3} more...
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
