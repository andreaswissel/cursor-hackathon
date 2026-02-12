import type { SessionContext, Session, AgentType, DocumentationPiece, DocPieceStatus, SessionMode, DiscoveryDashboard, DiscoveryRun, ProjectWithSessions, UserPreferences, KnowledgeSource, KnowledgeFilter, KnowledgeVisibility, SessionKnowledgeOverride, FlowArtifact, RoadmapItem, RoadmapItemStatus, RoadmapItemPriority } from "@product-os/shared";

// In production, use the full API URL; in dev, proxy through Vite
const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://api.product-os.ai/api");

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  const teamId = localStorage.getItem("active_team_id");
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (teamId) headers["X-Team-Id"] = teamId;
  return headers;
}

export interface SessionSummary {
  id: string;
  idea: string;
  status: string;
  mode?: SessionMode;
  createdAt: string;
}

export interface UsageStats {
  sessionCount: number;
  maxSessions: number | null; // null means unlimited
  canCreateSession: boolean;
}

export async function getUsageStats(): Promise<UsageStats> {
  const res = await fetch(`${API_BASE}/sessions/usage`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get usage stats");
  }

  return res.json();
}

export async function getAllSessions(): Promise<{ sessions: SessionSummary[] }> {
  const res = await fetch(`${API_BASE}/sessions`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get sessions");
  }

  return res.json();
}

// Project API functions

export async function getAllProjects(): Promise<{ projects: ProjectWithSessions[] }> {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get projects");
  }

  return res.json();
}

export async function createProject(
  name: string,
  description?: string
): Promise<ProjectWithSessions> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ name, description }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create project" }));
    throw new Error(error.message || error.error || "Failed to create project");
  }

  return res.json();
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; teamId?: string | null; repoUrl?: string | null }
): Promise<ProjectWithSessions> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update project" }));
    throw new Error(error.message || error.error || "Failed to update project");
  }

  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to delete project" }));
    throw new Error(error.message || error.error || "Failed to delete project");
  }
}

export async function createSession(
  idea: string,
  context: SessionContext,
  projectId?: string
): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ idea, context, projectId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create session" }));
    throw new Error(error.message || error.error || "Failed to create session");
  }

  return res.json();
}

export async function getSession(
  sessionId: string
): Promise<{ session: Session; usage?: { promptCount: number; maxPrompts: number; canSendPrompt: boolean } }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get session");
  }

  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to delete session" }));
    throw new Error(error.message || error.error || "Failed to delete session");
  }
}

export async function updateSession(
  sessionId: string,
  data: { title?: string; projectId?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update session" }));
    throw new Error(error.message || error.error || "Failed to update session");
  }
}

export async function answerQuestion(
  sessionId: string,
  agentType: string,
  questionId: string,
  answer: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ agentType, questionId, answer }),
  });

  if (!res.ok) {
    throw new Error("Failed to answer question");
  }
}

// Chat with an agent - returns an EventSource for streaming
export interface ChatWithAgentOptions {
  onAgentThinkingStart?: (agentType: string, label: string) => void;
  onThinking?: (content: string, agentType: string) => void;
  onAgentThinkingEnd?: (agentType: string, status: string) => void;
}

export function chatWithAgent(
  sessionId: string,
  agentType: AgentType,
  message: string,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  options?: ChatWithAgentOptions
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ agentType, message }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Failed to start chat" }));
      onError(error.message || error.error || "Failed to start chat");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              onText(data.content);
            } else if (data.type === "done") {
              onDone();
            } else if (data.type === "error") {
              onError(data.error);
            } else if (data.type === "agent-thinking-start" && options?.onAgentThinkingStart) {
              options.onAgentThinkingStart(data.agentType, data.agentLabel);
            } else if (data.type === "thinking" && options?.onThinking) {
              options.onThinking(data.content, data.agentType);
            } else if (data.type === "agent-thinking-end" && options?.onAgentThinkingEnd) {
              options.onAgentThinkingEnd(data.agentType, data.status);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }).catch((error) => {
    if (error.name !== "AbortError") {
      onError(error.message);
    }
  });

  return () => controller.abort();
}

export async function cancelAgent(sessionId: string, agentType: string): Promise<void> {
  await fetch(`${API_BASE}/sessions/${sessionId}/agents/${agentType}/cancel`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

export async function getChatHistory(
  sessionId: string,
  agentType: AgentType
): Promise<{ messages: Array<{ role: string; content: string; createdAt: string }> }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/chat/${agentType}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get chat history");
  }

  return res.json();
}

// Export for use in SSE connections
export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

// Integration data types
export interface IntegrationDataItem {
  id: string;
  integrationId: string;
  dataType: "okrs" | "feedback" | "tickets" | "docs" | "messages";
  sourceId: string;
  sourceName: string | null;
  title: string | null;
  summary: string | null;
  content: unknown;
  provider: string;
}

export async function getIntegrationData(): Promise<{ data: IntegrationDataItem[] }> {
  const res = await fetch(`${API_BASE}/integrations/data/all`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch integration data");
  }

  return res.json();
}

// Documentation Mode API functions

export async function createDocumentationSession(
  description: string,
  videoFile: File
): Promise<{ sessionId: string }> {
  const formData = new FormData();
  formData.append("description", description);
  formData.append("video", videoFile);

  const res = await fetch(`${API_BASE}/sessions/documentation`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create documentation session" }));
    throw new Error(error.message || error.error || "Failed to create documentation session");
  }

  return res.json();
}

export async function getDocumentationPieces(
  sessionId: string
): Promise<{ pieces: DocumentationPiece[] }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/documentation-pieces`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get documentation pieces");
  }

  return res.json();
}

export async function updateDocumentationPieceStatus(
  sessionId: string,
  pieceId: string,
  status: DocPieceStatus
): Promise<{ piece: DocumentationPiece }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/documentation-pieces/${pieceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error("Failed to update documentation piece status");
  }

  return res.json();
}

export function refineDocumentationPiece(
  sessionId: string,
  pieceId: string,
  message: string,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/sessions/${sessionId}/documentation-pieces/${pieceId}/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ message }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Failed to refine documentation piece" }));
      onError(error.message || error.error || "Failed to refine documentation piece");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              onText(data.content);
            } else if (data.type === "done") {
              onDone();
            } else if (data.type === "error") {
              onError(data.error);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }).catch((error) => {
    if (error.name !== "AbortError") {
      onError(error.message);
    }
  });

  return () => controller.abort();
}

// Discovery Mode API functions

export async function getDiscoveryDashboard(): Promise<DiscoveryDashboard> {
  const res = await fetch(`${API_BASE}/discovery`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get discovery dashboard");
  }

  return res.json();
}

export async function triggerDiscoveryRun(context?: {
  okrs: Array<{ objective: string; keyResults: string[] }>;
  customerFeedback: string[];
  internalFeedback?: Array<{ channel: string; author: string; message: string }>;
  metrics?: Array<{ name: string; value: string; trend: string; delta: string; source: string; description: string }>;
}): Promise<{ runId: string }> {
  const res = await fetch(`${API_BASE}/discovery/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(context ? { context } : {}),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to trigger discovery run" }));
    throw new Error(error.message || error.error || "Failed to trigger discovery run");
  }

  return res.json();
}

export async function getDiscoveryRunStatus(runId: string): Promise<DiscoveryRun> {
  const res = await fetch(`${API_BASE}/discovery/run/${runId}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get discovery run status");
  }

  return res.json();
}

// Admin — User Management

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}

export async function getUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch users" }));
    throw new Error(error.error || "Failed to fetch users");
  }

  const data = await res.json();
  return data.users;
}

export async function createUser(email: string, isAdmin?: boolean): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ email, isAdmin }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create user" }));
    throw new Error(error.error || "Failed to create user");
  }

  const data = await res.json();
  return data.user;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to delete user" }));
    throw new Error(error.error || "Failed to delete user");
  }
}

// Onboarding preferences
export async function saveOnboardingPreferences(
  preferences: UserPreferences,
  completed: boolean
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ preferences, completed }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to save preferences" }));
    throw new Error(error.message || error.error || "Failed to save preferences");
  }
}

// ============================================================
// Profile API
// ============================================================

export async function updateProfile(data: { displayName?: string; avatarUrl?: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update profile" }));
    throw new Error(error.error || "Failed to update profile");
  }
}

// ============================================================
// Team API
// ============================================================

export async function getTeams(): Promise<{ teams: Array<{ id: string; name: string; slug: string; avatarUrl: string | null; role: string; createdAt: string; updatedAt: string }> }> {
  const res = await fetch(`${API_BASE}/teams`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export async function createTeam(name: string): Promise<{ id: string; name: string; slug: string }> {
  const res = await fetch(`${API_BASE}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create team" }));
    throw new Error(error.error || "Failed to create team");
  }
  return res.json();
}

export async function getTeam(teamId: string): Promise<{ team: any; members: any[]; invites: any[] }> {
  const res = await fetch(`${API_BASE}/teams/${teamId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

export async function updateTeam(teamId: string, data: { name?: string; slug?: string; avatarUrl?: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/teams/${teamId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update team" }));
    throw new Error(error.error || "Failed to update team");
  }
  return res.json();
}

export async function deleteTeam(teamId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/teams/${teamId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to delete team" }));
    throw new Error(error.error || "Failed to delete team");
  }
}

export async function updateMemberRole(teamId: string, userId: string, role: string): Promise<void> {
  const res = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update role" }));
    throw new Error(error.error || "Failed to update role");
  }
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to remove member" }));
    throw new Error(error.error || "Failed to remove member");
  }
}

export async function createInvite(teamId: string, email?: string, role?: string): Promise<{ token: string; id: string }> {
  const res = await fetch(`${API_BASE}/teams/${teamId}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create invite" }));
    throw new Error(error.error || "Failed to create invite");
  }
  return res.json();
}

export async function revokeInvite(teamId: string, inviteId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/teams/${teamId}/invites/${inviteId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to revoke invite");
}

export async function getPendingInvites(): Promise<{ invites: any[] }> {
  const res = await fetch(`${API_BASE}/invites/pending`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch invites");
  return res.json();
}

export async function getInviteByToken(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/invites/${token}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Invite not found" }));
    throw new Error(error.error || "Invite not found");
  }
  return res.json();
}

export async function acceptInvite(token: string): Promise<{ success: boolean; teamId?: string }> {
  const res = await fetch(`${API_BASE}/invites/${token}/accept`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to accept invite" }));
    throw new Error(error.error || "Failed to accept invite");
  }
  return res.json();
}

export async function declineInvite(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/invites/${token}/decline`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to decline invite");
}

// ============================================================
// Knowledge API
// ============================================================

export async function getProjectKnowledge(projectId: string): Promise<{ sources: KnowledgeSource[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/knowledge`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch knowledge sources");
  return res.json();
}

export async function createKnowledgeSource(
  projectId: string,
  data: { name: string; description?: string; provider?: string; dataTypes?: string[]; filters?: KnowledgeFilter; visibility?: KnowledgeVisibility }
): Promise<KnowledgeSource> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create knowledge source" }));
    throw new Error(error.error || "Failed to create knowledge source");
  }
  return res.json();
}

export async function updateKnowledgeSource(
  projectId: string,
  id: string,
  data: Partial<{ name: string; description: string; provider: string | null; dataTypes: string[] | null; filters: KnowledgeFilter; visibility: KnowledgeVisibility; enabled: boolean }>
): Promise<KnowledgeSource> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/knowledge/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update knowledge source" }));
    throw new Error(error.error || "Failed to update knowledge source");
  }
  return res.json();
}

export async function deleteKnowledgeSource(projectId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/knowledge/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to delete knowledge source" }));
    throw new Error(error.error || "Failed to delete knowledge source");
  }
}

export async function resolveProjectKnowledge(projectId: string): Promise<{ items: IntegrationDataItem[]; count: number }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/knowledge/resolve`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to resolve knowledge");
  return res.json();
}

export async function summarizeKnowledgeSource(projectId: string, id: string): Promise<{ summary: string; generatedAt: string; itemCount: number }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/knowledge/${id}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to summarize" }));
    throw new Error(error.error || "Failed to summarize");
  }
  return res.json();
}

export async function getSessionKnowledge(sessionId: string): Promise<{
  items: IntegrationDataItem[];
  sources: Array<{ id: string; name: string; enabled: boolean; visibility: string }>;
  overrides: SessionKnowledgeOverride[];
  context: SessionContext;
}> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/knowledge`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get session knowledge");
  return res.json();
}

export async function addSessionKnowledgeOverride(
  sessionId: string,
  data: { knowledgeSourceId?: string; integrationDataId?: string; action: "add" | "remove" }
): Promise<SessionKnowledgeOverride> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/knowledge/overrides`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to add override" }));
    throw new Error(error.error || "Failed to add override");
  }
  return res.json();
}

export async function removeSessionKnowledgeOverride(sessionId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/knowledge/overrides/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove override");
}

// ============================================================
// Flow Mode API
// ============================================================

export async function createFlowSession(
  message: string,
  projectId?: string,
  repoUrl?: string
): Promise<{ sessionId: string; title: string }> {
  const res = await fetch(`${API_BASE}/sessions/flow`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ message, projectId, repoUrl }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create flow session" }));
    throw new Error(error.message || error.error || "Failed to create flow session");
  }

  return res.json();
}

export async function connectRepo(
  sessionId: string,
  repoUrl: string
): Promise<{ success: boolean; repoUrl: string }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/connect-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ repoUrl }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to connect repo" }));
    throw new Error(error.message || error.error || "Failed to connect repo");
  }

  return res.json();
}

export async function getFlowArtifacts(sessionId: string): Promise<{ artifacts: FlowArtifact[] }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/artifacts`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to get artifacts");
  }

  return res.json();
}

export async function deleteFlowArtifact(sessionId: string, artifactId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/artifacts/${artifactId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete artifact");
  }
}

// ============================================================
// Roadmap API
// ============================================================

export async function getRoadmapItems(): Promise<{ items: RoadmapItem[] }> {
  const res = await fetch(`${API_BASE}/roadmap`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch roadmap items");
  return res.json();
}

export async function createRoadmapItem(data: {
  title: string;
  description?: string;
  status?: RoadmapItemStatus;
  priority?: RoadmapItemPriority;
  targetQuarter?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  order?: number;
  linkedSessionIds?: string[];
}): Promise<RoadmapItem> {
  const res = await fetch(`${API_BASE}/roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create roadmap item" }));
    throw new Error(error.error || "Failed to create roadmap item");
  }
  return res.json();
}

export async function updateRoadmapItem(
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    status: RoadmapItemStatus;
    priority: RoadmapItemPriority;
    targetQuarter: string | null;
    startDate: string | null;
    endDate: string | null;
    order: number;
    linkedSessionIds: string[];
  }>
): Promise<RoadmapItem> {
  const res = await fetch(`${API_BASE}/roadmap/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update roadmap item" }));
    throw new Error(error.error || "Failed to update roadmap item");
  }
  return res.json();
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/roadmap/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to delete roadmap item" }));
    throw new Error(error.error || "Failed to delete roadmap item");
  }
}

// ============================================================
// Tools API (Guided Tours, Feedback Forms)
// ============================================================

export async function createGuidedToursSession(
  message: string,
  sessionLink?: string,
  projectId?: string
): Promise<{ sessionId: string; title: string }> {
  const res = await fetch(`${API_BASE}/sessions/guided-tours`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ message, sessionLink, projectId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create guided tours session" }));
    throw new Error(error.message || error.error || "Failed to create guided tours session");
  }

  return res.json();
}

export async function createFeedbackFormsSession(
  message: string,
  projectId?: string
): Promise<{ sessionId: string; title: string }> {
  const res = await fetch(`${API_BASE}/sessions/feedback-forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ message, projectId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create feedback forms session" }));
    throw new Error(error.message || error.error || "Failed to create feedback forms session");
  }

  return res.json();
}

export async function searchSessionsForLinking(query: string): Promise<{ sessions: Array<{ id: string; idea: string; status: string; mode?: string }> }> {
  const res = await fetch(`${API_BASE}/roadmap/sessions/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to search sessions");
  return res.json();
}
