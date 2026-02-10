import type { SessionContext, Session, AgentType, DocumentationPiece, DocPieceStatus, SessionMode, DiscoveryDashboard, DiscoveryRun, ProjectWithSessions, UserPreferences } from "@product-os/shared";

// In production, use the full API URL; in dev, proxy through Vite
const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://api.product-os.ai/api");

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  data: { name?: string; description?: string }
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
export function chatWithAgent(
  sessionId: string,
  agentType: AgentType,
  message: string,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
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
