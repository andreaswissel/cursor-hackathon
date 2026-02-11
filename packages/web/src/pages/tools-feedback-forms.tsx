import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createFeedbackFormsSession, getAllProjects } from "@/lib/api";
import { Sidebar } from "@/components/sidebar";
import type { ProjectWithSessions } from "@product-os/shared";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquareMore, Send } from "lucide-react";

export function ToolsFeedbackFormsPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { sessionId } = await createFeedbackFormsSession(text);
      sessionStorage.setItem(`flow-pending-${sessionId}`, text);
      navigate(`/session/${sessionId}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        projects={projects}
        onProjectCreated={refreshProjects}
        onProjectDeleted={refreshProjects}
        onSessionDeleted={refreshProjects}
      />

      <main className="flex-1 flex flex-col pt-14 md:pt-0 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <MessageSquareMore className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-lg font-semibold mb-1">Feedback Forms</h1>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            Create targeted feedback forms to capture user sentiment and feature requests. Describe the feature or idea you want feedback on.
          </p>
        </div>

        <div className="border-t px-4 md:px-6 py-3 bg-background">
          {error && (
            <div className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-600 mb-2">
              {error}
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What feature or idea do you want feedback on?"
                  rows={1}
                  className="w-full resize-none rounded-xl border bg-secondary/50 px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-[160px]"
                  style={{ height: "auto", overflow: "hidden" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 160) + "px";
                  }}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                    input.trim() && !isLoading
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "text-muted-foreground"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
