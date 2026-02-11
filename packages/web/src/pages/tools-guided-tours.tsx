import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createGuidedToursSession, getAllProjects } from "@/lib/api";
import { Sidebar } from "@/components/sidebar";
import type { ProjectWithSessions } from "@product-os/shared";
import { cn } from "@/lib/utils";
import { Loader2, Navigation, Send, Link as LinkIcon } from "lucide-react";

export function ToolsGuidedToursPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sessionLink, setSessionLink] = useState("");
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
      const { sessionId } = await createGuidedToursSession(
        text,
        sessionLink.trim() || undefined
      );
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
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Navigation className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-lg font-semibold mb-1">Guided Tours</h1>
          <p className="text-sm text-muted-foreground max-w-md text-center mb-8">
            Design step-by-step product tours that onboard users and highlight key features. Describe your product or feature to get started.
          </p>

          <div className="w-full max-w-lg space-y-3">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={sessionLink}
                onChange={(e) => setSessionLink(e.target.value)}
                placeholder="Paste a session link for context (optional)"
                className="w-full rounded-xl border bg-secondary/50 pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
            </div>
          </div>
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
                  placeholder="Describe the product or feature you want to create a tour for..."
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
