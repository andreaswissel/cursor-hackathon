import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createFlowSession, getAllProjects } from "@/lib/api";
import { Sidebar } from "@/components/sidebar";
import type { ProjectWithSessions } from "@product-os/shared";
import { ArrowRight, Loader2, Workflow } from "lucide-react";

export function FlowPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { sessionId } = await createFlowSession(
        title.trim(),
        selectedProjectId || undefined,
        repoUrl.trim() || undefined
      );
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
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

      <main className="flex-1 flex items-center justify-center pt-14 md:pt-0 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Workflow className="w-7 h-7 text-violet-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Flow Mode</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Start a continuous conversation to plan, build, and review product features with AI agents.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                What do you want to build?
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., User authentication system with OAuth"
                className="w-full px-4 py-3 rounded-xl border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Project
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Default project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Repository URL
                <span className="text-muted-foreground font-normal ml-1">(optional, for code agents)</span>
              </label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="w-full px-4 py-3 rounded-xl border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!title.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting flow...
                </>
              ) : (
                <>
                  Start Flow
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
