import { useState, useEffect, useCallback } from "react";
import { FlowChatThread } from "@/components/flow-chat-thread";
import { FlowArtifactPanel } from "@/components/flow-artifact-panel";
import { cn } from "@/lib/utils";
import type { FlowArtifact, AgentType, AgentState } from "@product-os/shared";
import { getFlowArtifacts, connectRepo, updateProject } from "@/lib/api";
import { Package, X } from "lucide-react";

interface FlowSessionPageProps {
  sessionId: string;
  artifacts: FlowArtifact[];
  repoUrl?: string;
  projectId?: string;
  agents?: Record<AgentType, AgentState>;
}

export function FlowSessionPage({ sessionId, artifacts: sseArtifacts, repoUrl: initialRepoUrl, projectId, agents }: FlowSessionPageProps) {
  const [artifacts, setArtifacts] = useState<FlowArtifact[]>([]);
  const [showArtifacts, setShowArtifacts] = useState(true);
  const [repoUrl, setRepoUrl] = useState<string | undefined>(initialRepoUrl);

  useEffect(() => {
    setRepoUrl(initialRepoUrl);
  }, [initialRepoUrl]);

  const handleConnectRepo = useCallback(async (url: string) => {
    try {
      await connectRepo(sessionId, url);
      setRepoUrl(url);
      // Persist to project for future sessions
      if (projectId) {
        updateProject(projectId, { repoUrl: url }).catch(console.error);
      }
    } catch (err) {
      console.error("Failed to connect repo:", err);
    }
  }, [sessionId, projectId]);

  // Load initial artifacts from API, then overlay with SSE artifacts
  useEffect(() => {
    getFlowArtifacts(sessionId)
      .then(({ artifacts: loaded }) => setArtifacts(loaded))
      .catch(console.error);
  }, [sessionId]);

  // Merge SSE artifacts into the list
  useEffect(() => {
    if (sseArtifacts.length === 0) return;
    setArtifacts((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      for (const a of sseArtifacts) {
        map.set(a.id, a);
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [sseArtifacts]);

  return (
    <div className="flex h-full">
      {/* Chat Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        <FlowChatThread sessionId={sessionId} repoUrl={repoUrl} onConnectRepo={handleConnectRepo} agents={agents} />
      </div>

      {/* Artifact Panel Toggle (mobile + when hidden) */}
      {!showArtifacts && (
        <button
          onClick={() => setShowArtifacts(true)}
          className="fixed right-4 bottom-4 md:relative md:right-auto md:bottom-auto flex items-center gap-2 px-3 py-2 rounded-lg border bg-card shadow-lg md:shadow-none md:border-l md:rounded-none md:px-4 md:py-3 hover:bg-secondary transition-colors z-10"
        >
          <Package className="w-4 h-4 text-muted-foreground" />
          {artifacts.length > 0 && (
            <span className="text-xs bg-foreground text-background px-1.5 py-0.5 rounded-full">
              {artifacts.length}
            </span>
          )}
        </button>
      )}

      {/* Artifact Panel */}
      {showArtifacts && (
        <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 relative">
          <button
            onClick={() => setShowArtifacts(false)}
            className="absolute top-3 right-3 z-10 p-1 rounded hover:bg-secondary transition-colors md:hidden"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <FlowArtifactPanel artifacts={artifacts} className="w-full" />
        </div>
      )}
    </div>
  );
}
