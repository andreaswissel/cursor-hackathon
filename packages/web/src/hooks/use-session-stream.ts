import { useEffect, useState, useRef } from "react";
import type { Session, AgentType, AgentLog, AgentStatus, AgentState, SSEEvent, FlowArtifact } from "@product-os/shared";
import { getAuthToken } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://api.product-os.ai/api");

interface UseSessionStreamResult {
  session: Session | null;
  isConnected: boolean;
  error: string | null;
  /** True if we have session data but lost connection (content still usable) */
  isReconnecting: boolean;
  artifacts: FlowArtifact[];
}

export function useSessionStream(sessionId: string): UseSessionStreamResult {
  const [session, setSession] = useState<Session | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<FlowArtifact[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    function connect() {
      const token = getAuthToken();
      const url = token
        ? `${API_BASE}/sessions/${sessionId}/stream?token=${encodeURIComponent(token)}`
        : `${API_BASE}/sessions/${sessionId}/stream`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        retryCountRef.current = 0;
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

          case "agent:output": {
            const payload = data.payload as {
              sessionId: string;
              agentType: AgentType;
              output: unknown;
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
                    output: payload.output,
                  },
                },
              };
            });
            break;
          }

          case "documentation:piece":
          case "documentation:piece:updated": {
            // These events are handled by the session page which polls for pieces
            // We could add a documentationPieces array to Session and update it here
            // but for simplicity, we just trigger a refresh by updating a timestamp
            setSession((prev) => {
              if (!prev) return prev;
              return { ...prev };
            });
            break;
          }

          case "artifact:created": {
            const payload = data.payload as { sessionId: string; artifact: FlowArtifact };
            setArtifacts((prev) => [...prev, payload.artifact]);
            break;
          }

          case "artifact:updated": {
            const payload = data.payload as { sessionId: string; artifactId: string; artifact: FlowArtifact };
            setArtifacts((prev) =>
              prev.map((a) => (a.id === payload.artifactId ? payload.artifact : a))
            );
            break;
          }

          case "artifact:deleted": {
            const payload = data.payload as { sessionId: string; artifactId: string };
            setArtifacts((prev) => prev.filter((a) => a.id !== payload.artifactId));
            break;
          }
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current++;

        if (retryCountRef.current <= 10) {
          setError(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`);
          retryTimerRef.current = setTimeout(connect, delay);
        } else {
          setError("Connection lost. Please refresh the page.");
        }
      };
    }

    connect();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [sessionId]);

  // If we have session data but lost connection, we're reconnecting (not fatally errored)
  const isReconnecting = !isConnected && session !== null && error !== null;

  return { session, isConnected, error, isReconnecting, artifacts };
}
