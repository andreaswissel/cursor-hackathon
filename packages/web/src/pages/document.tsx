import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createDocumentationSession, getAllProjects, getUsageStats, type UsageStats } from "@/lib/api";
import type { ProjectWithSessions } from "@product-os/shared";
import { Sidebar } from "@/components/sidebar";
import { VideoUpload } from "@/components/video-upload";
import { ArrowRight, AlertCircle } from "lucide-react";

export function DocumentPage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);

    getUsageStats()
      .then((stats) => setUsageStats(stats))
      .catch(console.error);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !videoFile) return;
    if (usageStats && !usageStats.canCreateSession) return;

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
  };

  const canSubmit = description.trim().length > 0 && videoFile !== null;

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects} onProjectCreated={refreshProjects} onProjectDeleted={refreshProjects} onSessionDeleted={refreshProjects} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight mb-3">
              Video to documentation
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload a video and let AI generate structured documentation pieces you can review and refine.
            </p>
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

          {/* Documentation form */}
          <form onSubmit={handleSubmit} className="mb-12">
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
          </form>
        </div>
      </main>
    </div>
  );
}
