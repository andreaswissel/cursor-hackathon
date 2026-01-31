import type { SessionContext, Session } from "@product-os/shared";

const API_BASE = "/api";

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
