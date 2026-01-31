import type { SessionContext, Session, AgentType } from "@product-os/shared";

// In production, use the full API URL; in dev, proxy through Vite
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface SessionSummary {
  id: string;
  idea: string;
  status: string;
  createdAt: string;
}

export async function getAllSessions(): Promise<{ sessions: SessionSummary[] }> {
  const res = await fetch(`${API_BASE}/sessions`);

  if (!res.ok) {
    throw new Error("Failed to get sessions");
  }

  return res.json();
}

export async function createSession(
  idea: string,
  context: SessionContext
): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, context }),
  });

  if (!res.ok) {
    throw new Error("Failed to create session");
  }

  return res.json();
}

export async function getSession(
  sessionId: string
): Promise<{ session: Session }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);

  if (!res.ok) {
    throw new Error("Failed to get session");
  }

  return res.json();
}

export async function answerQuestion(
  sessionId: string,
  agentType: string,
  questionId: string,
  answer: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentType, message }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      onError("Failed to start chat");
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
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/chat/${agentType}`);

  if (!res.ok) {
    throw new Error("Failed to get chat history");
  }

  return res.json();
}
