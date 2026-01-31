import { useEffect, useState, useRef } from "react";
import type { Session, AgentType, AgentLog, AgentStatus, AgentState, SSEEvent } from "@product-os/shared";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface UseSessionStreamResult {
  session: Session | null;
  isConnected: boolean;
  error: string | null;
}

export function useSessionStream(sessionId: string): UseSessionStreamResult {
  const [session, setSession] = useState<Session | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`${API_BASE}/sessions/${sessionId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;

        switch (data.type) {
          case "init": {
            const payload = data.payload as { session: Session };
            setSession(payload.session);
            break;
          }

          case "agent:init": {
            const payload = data.payload as {
              sessionId: string;
              agent: AgentState;
            };
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                agents: {
                  ...prev.agents,
                  [payload.agent.type]: payload.agent,
                },
              };
            });
            break;
          }

          case "agent:log": {
            const payload = data.payload as {
              sessionId: string;
              agentType: AgentType;
              log: AgentLog;
            };
            setSession((prev) => {
              if (!prev) return prev;
              const agent = prev.agents[payload.agentType];
              if (!agent) return prev;
              return {
                ...prev,
                agents: {
                  ...prev.agents,
                  [payload.agentType]: {
                    ...agent,
                    logs: [...agent.logs, payload.log],
                  },
                },
              };
            });
            break;
          }

          case "agent:status": {
            const payload = data.payload as {
              sessionId: string;
              agentType: AgentType;
              status: AgentStatus;
            };
            setSession((prev) => {
              if (!prev) return prev;
              const agent = prev.agents[payload.agentType];
              if (!agent) return prev;
              return {
                ...prev,
                agents: {
                  ...prev.agents,
                  [payload.agentType]: {
                    ...agent,
                    status: payload.status,
                  },
                },
              };
            });
            break;
          }

          case "agent:question": {
            const payload = data.payload as {
              sessionId: string;
              agentType: AgentType;
              questionId: string;
              question: string;
            };
            setSession((prev) => {
              if (!prev) return prev;
              const agent = prev.agents[payload.agentType];
              if (!agent) return prev;
              return {
                ...prev,
                agents: {
                  ...prev.agents,
                  [payload.agentType]: {
                    ...agent,
                    currentQuestion: {
                      id: payload.questionId,
                      question: payload.question,
                    },
                  },
                },
              };
            });
            break;
          }

          case "session:status": {
            const payload = data.payload as {
              sessionId: string;
              status: Session["status"];
            };
            setSession((prev) => {
              if (!prev) return prev;
              return { ...prev, status: payload.status };
            });
            break;
          }

          case "session:output": {
            const payload = data.payload as {
              sessionId: string;
              type: keyof Session["outputs"];
              content: string;
            };
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                outputs: {
                  ...prev.outputs,
                  [payload.type]: payload.content,
                },
              };
            });
            break;
          }
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Connection lost");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sessionId]);

  return { session, isConnected, error };
}
