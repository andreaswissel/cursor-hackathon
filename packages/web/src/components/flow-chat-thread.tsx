import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { chatWithAgent, getChatHistory, cancelAgent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import ReactMarkdown from "react-markdown";
import { CollapsibleThinking } from "./collapsible-thinking";
import { ContextMenuPopup, type ContextMenuItem } from "./context-menu-popup";
import type { AgentType, AgentState, FlowArtifact } from "@product-os/shared";
import {
  Send,
  Loader2,
  Plus,
  Code2,
  ShieldCheck,
  Bot,
  GitBranch,
  Link,
  Search,
  Target,
  FileText,
  Megaphone,
  Newspaper,
  ScrollText,
  Square,
  AlertTriangle,
  ExternalLink,
  Settings,
} from "lucide-react";

interface AgentThinking {
  agentType: string;
  agentLabel: string;
  logs: string[];
  status: "running" | "completed" | "failed";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  agentThinking?: AgentThinking;
}

interface ParsedAssistantError {
  kind: "quota" | "generic";
  provider: "gemini" | "openai" | "anthropic" | null;
  model: string | null;
  retryAfterSeconds: number | null;
  helpUrl: string | null;
  summary: string;
  raw: string;
}

interface FlowChatThreadProps {
  sessionId: string;
  repoUrl?: string;
  onConnectRepo?: (url: string) => void;
  agents?: Record<AgentType, AgentState>;
  artifacts?: FlowArtifact[];
}

const AGENT_COMMANDS = [
  { prefix: "@Code", label: "Code", description: "Implement code changes", icon: Code2, requiresRepo: true },
  { prefix: "@Review", label: "Review", description: "Review code for issues", icon: ShieldCheck, requiresRepo: true },
  { prefix: "@Spec", label: "Spec", description: "Write a feature spec", icon: FileText, requiresRepo: false },
  { prefix: "@Strategy", label: "Strategy", description: "Assess strategic fit", icon: Target, requiresRepo: false },
  { prefix: "@Discovery", label: "Discovery", description: "Run discovery research", icon: Search, requiresRepo: false },
  { prefix: "@GTM", label: "GTM", description: "Plan go-to-market", icon: Megaphone, requiresRepo: false },
  { prefix: "@Marketing", label: "Marketing", description: "Write product update", icon: Newspaper, requiresRepo: false },
  { prefix: "@Changelog", label: "Changelog", description: "Write changelog entries", icon: ScrollText, requiresRepo: false },
];
const AGENT_COMMAND_PREFIXES = [...AGENT_COMMANDS.map((cmd) => cmd.prefix), "@Discover"];

function formatMessageTime(dateStr?: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getInitials(displayName?: string | null, email?: string | null): string {
  const source = (displayName || email || "").trim();
  if (!source) return "U";

  const words = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (words.length === 0) return "U";
  const first = words[0] ?? "";
  if (words.length === 1) return first.slice(0, 2).toUpperCase() || "U";
  const second = words[1] ?? "";
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "U";
}

function parseAssistantError(content: string): ParsedAssistantError | null {
  if (!/^error:\s*/i.test(content.trim())) return null;

  const raw = content.replace(/^error:\s*/i, "").trim();
  const lower = raw.toLowerCase();
  const provider: ParsedAssistantError["provider"] = lower.includes("googlegenerativeai") || lower.includes("gemini")
    ? "gemini"
    : lower.includes("openai")
    ? "openai"
    : lower.includes("anthropic") || lower.includes("claude")
    ? "anthropic"
    : null;

  const modelMatch =
    raw.match(/models\/([a-z0-9.-]+)(?::|[?]|$)/i) ||
    raw.match(/model[:=]\s*([a-z0-9.-]+)/i);
  const model = modelMatch?.[1] ?? null;

  const retryMatch =
    raw.match(/retry(?: in)?\s+(\d+(?:\.\d+)?)s/i) ||
    raw.match(/"retrydelay":"?(\d+(?:\.\d+)?)s"?/i);
  const retryAfterSeconds = retryMatch ? Math.max(1, Math.round(Number(retryMatch[1]))) : null;

  const helpUrlMatch = raw.match(/https?:\/\/[^\s)]+/i);
  const helpUrl = helpUrlMatch?.[0] ?? null;

  const isQuotaError =
    /\b429\b/.test(lower) ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("resource_exhausted");

  if (isQuotaError) {
    return {
      kind: "quota",
      provider,
      model,
      retryAfterSeconds,
      helpUrl,
      summary:
        provider === "gemini"
          ? "Gemini API quota was exceeded for this workspace key."
          : "Provider quota or rate limit was exceeded for this request.",
      raw,
    };
  }

  return {
    kind: "generic",
    provider,
    model,
    retryAfterSeconds,
    helpUrl,
    summary: "The model provider returned an error for this request.",
    raw,
  };
}

function AssistantErrorCard({ error }: { error: ParsedAssistantError }) {
  const providerLabel =
    error.provider === "gemini" ? "Gemini" : error.provider === "openai" ? "OpenAI" : error.provider === "anthropic" ? "Anthropic" : "Provider";
  const title = error.kind === "quota" ? `${providerLabel} quota reached` : `${providerLabel} request failed`;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-6 w-6 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
        </div>

        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold text-amber-100">{title}</p>
            <p className="text-xs text-amber-100/80">{error.summary}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {error.model && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-300/25 text-amber-100/90">
                Model: {error.model}
              </span>
            )}
            {error.retryAfterSeconds && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-300/25 text-amber-100/90">
                Retry in ~{error.retryAfterSeconds}s
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/25 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100 hover:bg-amber-500/20 transition-colors"
            >
              <Settings className="w-3 h-3" />
              Open Settings
            </a>
            {(error.helpUrl || error.provider === "gemini") && (
              <a
                href={error.helpUrl || "https://ai.google.dev/gemini-api/docs/rate-limits"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/25 bg-transparent px-2.5 py-1 text-xs text-amber-100/90 hover:bg-amber-500/15 transition-colors"
              >
                View limits
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <details className="group">
            <summary className="cursor-pointer text-[11px] text-amber-100/70 hover:text-amber-100/90 transition-colors">
              Technical details
            </summary>
            <pre className="mt-2 text-[11px] leading-relaxed whitespace-pre-wrap rounded-md border border-amber-300/20 bg-black/20 p-2 text-amber-100/80 max-h-44 overflow-y-auto scrollbar-subtle">
              {error.raw}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

export function FlowChatThread({ sessionId, repoUrl, onConnectRepo, agents, artifacts = [] }: FlowChatThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showRepoPrompt, setShowRepoPrompt] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [connectingRepo, setConnectingRepo] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    trigger: "@" | "$" | "#";
    query: string;
    position: { bottom: number; left: number };
  } | null>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const userInitials = useMemo(
    () => getInitials(user?.displayName, user?.email),
    [user?.displayName, user?.email]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load chat history on mount + auto-send pending message from flow page
  useEffect(() => {
    getChatHistory(sessionId, "flow-orchestrator")
      .then(({ messages: history }) => {
        setMessages(
          history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt,
          }))
        );
        setIsLoading(false);

        // Check for pending message from /flow page
        const pendingKey = `flow-pending-${sessionId}`;
        const pendingMessage = sessionStorage.getItem(pendingKey);
        if (pendingMessage && history.length === 0) {
          sessionStorage.removeItem(pendingKey);
          setTimeout(() => handleSend(pendingMessage), 0);
        }
      })
      .catch(() => setIsLoading(false));
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Reconstruct thinking blocks from SSE agent state after initial load
  useEffect(() => {
    if (isLoading || !agents) return;

    // Map agent types to their @prefix and label (mirrors backend AGENT_PREFIX_MAP)
    const agentMeta: Record<string, { prefix: string; label: string }> = {
      "code-agent":        { prefix: "@Code",      label: "Code" },
      "review-agent":      { prefix: "@Review",    label: "Review" },
      "changelog-agent":   { prefix: "@Changelog", label: "Changelog" },
      "discovery":         { prefix: "@Discovery",  label: "Discovery" },
      "strategy":          { prefix: "@Strategy",   label: "Strategy" },
      "spec":              { prefix: "@Spec",        label: "Spec" },
      "gtm":               { prefix: "@GTM",         label: "GTM" },
      "product-marketing": { prefix: "@Marketing",  label: "Marketing" },
    };

    setMessages(prev => {
      const updated = [...prev];
      let inserted = false;

      for (const [type, meta] of Object.entries(agentMeta)) {
        const agent = agents[type as AgentType];
        if (!agent || agent.logs.length === 0) continue;

        const hasThinking = updated.some(m => m.agentThinking?.agentType === type);
        if (hasThinking) continue;

        const thinking: AgentThinking = {
          agentType: type,
          agentLabel: meta.label,
          logs: agent.logs.map(l => l.content),
          status: agent.status === "running" ? "running" : agent.status === "completed" ? "completed" : "failed",
        };

        const thinkingMsg: ChatMessage = {
          role: "assistant",
          content: "",
          createdAt: agent.logs[0]?.timestamp,
          agentThinking: thinking,
        };

        // Find the triggering user message (uses includes to match backend behavior)
        const triggerIdx = updated.findIndex(
          m => m.role === "user" && m.content.includes(meta.prefix)
        );

        if (triggerIdx >= 0) {
          // Insert right after the triggering user message
          updated.splice(triggerIdx + 1, 0, thinkingMsg);
        } else {
          // Fallback: append at end
          updated.push(thinkingMsg);
        }
        inserted = true;
      }

      return inserted ? updated : prev;
    });
  }, [isLoading, agents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep thinking blocks in sync with live SSE agent state updates
  useEffect(() => {
    if (!agents) return;

    setMessages(prev => prev.map(msg => {
      if (!msg.agentThinking) return msg;
      const agent = agents[msg.agentThinking.agentType as AgentType];
      if (!agent) return msg;

      const newStatus = agent.status === "running" ? "running" : agent.status === "completed" ? "completed" : "failed";
      const newLogs = agent.logs.map(l => l.content);

      if (newLogs.length === msg.agentThinking.logs.length && newStatus === msg.agentThinking.status) return msg;

      return {
        ...msg,
        agentThinking: {
          ...msg.agentThinking,
          logs: newLogs,
          status: newStatus,
        },
      };
    }));
  }, [agents]);

  // Click outside to close agent menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setShowAgentMenu(false);
      }
    }
    if (showAgentMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAgentMenu]);

  const isAgentCommandMessage = useCallback((text: string): boolean => {
    return AGENT_COMMAND_PREFIXES.some((prefix) =>
      new RegExp(`(^|\\s)${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "i").test(text)
    );
  }, []);

  const handleSend = useCallback(
    (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text) return;
      const isAgentCommand = isAgentCommandMessage(text);

      // Dismiss context menu
      setContextMenu(null);

      const userMessage: ChatMessage = {
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      if (!isAgentCommand) {
        setIsStreaming(true);
        setStreamingContent("");
      }

      let bufferedContent = "";

      abortRef.current = chatWithAgent(
        sessionId,
        "flow-orchestrator",
        text,
        (chunk) => {
          if (isAgentCommand && bufferedContent.length > 0) {
            bufferedContent += "\n\n";
          }
          bufferedContent += chunk;
          if (!isAgentCommand) {
            setStreamingContent(bufferedContent);
          }
        },
        () => {
          const finalContent = bufferedContent.trim();
          if (finalContent) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: finalContent, createdAt: new Date().toISOString() },
            ]);
          }
          if (!isAgentCommand) {
            setStreamingContent("");
            setIsStreaming(false);
          }
        },
        (error) => {
          console.error("Chat error:", error);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${error}`,
              createdAt: new Date().toISOString(),
            },
          ]);
          if (!isAgentCommand) {
            setStreamingContent("");
            setIsStreaming(false);
          }
        },
        {
          onAgentThinkingStart: (agentType, agentLabel) => {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "",
                createdAt: new Date().toISOString(),
                agentThinking: {
                  agentType,
                  agentLabel,
                  logs: [],
                  status: "running",
                },
              },
            ]);
          },
          onThinking: (content, agentType) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.agentThinking?.agentType === agentType
                  ? {
                      ...m,
                      agentThinking: {
                        ...m.agentThinking,
                        logs: [...m.agentThinking.logs, content],
                      },
                    }
                  : m
              )
            );
          },
          onAgentThinkingEnd: (agentType, status) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.agentThinking?.agentType === agentType
                  ? {
                      ...m,
                      agentThinking: {
                        ...m.agentThinking,
                        status: status as "completed" | "failed",
                      },
                    }
                  : m
              )
            );
          },
        }
      );
    },
    [input, isAgentCommandMessage, sessionId]
  );

  const stopAgent = useCallback((agentType: string) => {
    cancelAgent(sessionId, agentType).catch(() => {});
    abortRef.current?.();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingContent("");
    setMessages((prev) =>
      prev.map((m) =>
        m.agentThinking?.agentType === agentType && m.agentThinking.status === "running"
          ? {
              ...m,
              agentThinking: {
                ...m.agentThinking,
                status: "failed",
              },
            }
          : m
      )
    );
  }, [sessionId]);

  const runningAgentTypes = useMemo(() => {
    const running = new Set<string>();

    for (const message of messages) {
      if (message.agentThinking?.status === "running") {
        running.add(message.agentThinking.agentType);
      }
    }

    if (agents) {
      for (const [agentType, agentState] of Object.entries(agents)) {
        if (agentState.status === "running") {
          running.add(agentType);
        }
      }
    }

    return Array.from(running);
  }, [messages, agents]);

  const handleStopAllRunningAgents = useCallback(() => {
    for (const agentType of runningAgentTypes) {
      stopAgent(agentType);
    }
  }, [runningAgentTypes, stopAgent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If context menu is open, let it handle keyboard
    if (contextMenu) {
      if (e.key === "Escape") {
        e.preventDefault();
        setContextMenu(null);
        return;
      }
      // Don't intercept Enter when context menu is open — menu handles selection
      if (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        return; // Let the event propagate to the ContextMenuPopup
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAgentTrigger = (agentPrefix: string, requiresRepo: boolean) => {
    if (requiresRepo && !repoUrl) {
      setShowRepoPrompt(true);
      setShowAgentMenu(false);
      return;
    }
    const currentInput = input.trim();
    const newInput = currentInput
      ? `${agentPrefix} ${currentInput}`
      : `${agentPrefix} `;
    setInput(newInput);
    setShowAgentMenu(false);
    inputRef.current?.focus();
  };

  const handleConnectRepo = () => {
    if (!repoInput.trim() || connectingRepo) return;
    setConnectingRepo(true);
    onConnectRepo?.(repoInput.trim());
    setShowRepoPrompt(false);
    setRepoInput("");
    setConnectingRepo(false);
  };

  // Handle input change with context menu detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Check for context menu triggers
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/([@$#])([a-zA-Z0-9_-]*)$/);

    if (match) {
      const trigger = match[1] as "@" | "$" | "#";
      const query = match[2] || "";
      const textarea = inputRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        setContextMenu({
          trigger,
          query,
          position: { bottom: window.innerHeight - rect.top + 8, left: rect.left },
        });
      }
    } else {
      setContextMenu(null);
    }
  };

  const handleContextMenuSelect = (item: ContextMenuItem) => {
    if (!contextMenu || !inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPos);
    const match = textBeforeCursor.match(/([@$#])([a-zA-Z0-9_-]*)$/);

    if (!match) return;

    const triggerStart = cursorPos - match[0].length;
    const textAfterCursor = input.slice(cursorPos);
    let replacement = "";

    if (contextMenu.trigger === "@") {
      replacement = `${item.insertText ?? `@${item.label}`} `;
    } else if (contextMenu.trigger === "$") {
      replacement = `$${item.id} `;
    } else if (contextMenu.trigger === "#") {
      // Skills map to @Agent prefix
      replacement = item.id + " ";
    }

    const newInput = input.slice(0, triggerStart) + replacement + textAfterCursor;
    setInput(newInput);
    setContextMenu(null);
    inputRef.current.focus();
  };

  // Strip artifact blocks from display content
  const stripArtifacts = (text: string) => {
    return text.replace(/\[ARTIFACT:\w[\w-]*:[^\]]+\]\n?[\s\S]*?\[\/ARTIFACT\]/g, "").trim();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-subtle px-4 md:px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Flow Mode</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Start a conversation to plan, build, and ship. Use @ for agents and artifacts, $ for sessions, # for skills.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          // Render collapsible thinking block
          if (msg.agentThinking) {
            return (
              <div key={i} className="mr-auto">
                <CollapsibleThinking
                  agentType={msg.agentThinking.agentType}
                  agentLabel={msg.agentThinking.agentLabel}
                  logs={msg.agentThinking.logs}
                  status={msg.agentThinking.status}
                  startedAt={msg.createdAt}
                  onStop={
                    msg.agentThinking.status === "running"
                      ? () => stopAgent(msg.agentThinking!.agentType)
                      : undefined
                  }
                />
              </div>
            );
          }

          // Skip empty assistant messages (thinking placeholders with no text content)
          if (msg.role === "assistant" && !msg.content) return null;
          const parsedError = msg.role === "assistant" ? parseAssistantError(msg.content) : null;
          const messageTime = formatMessageTime(msg.createdAt);

          return (
            <div
              key={i}
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border",
                  msg.role === "user"
                    ? "bg-card text-foreground border-border/70"
                    : "bg-secondary border-border/60"
                )}
              >
                {msg.role === "user" ? (
                  <span className="text-[10px] font-semibold tracking-wide">{userInitials}</span>
                ) : (
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm border",
                  msg.role === "user"
                    ? "bg-card/80 text-foreground border-border/70 shadow-[0_1px_0_hsl(var(--foreground)/0.04)]"
                    : "bg-secondary border-border/60"
                )}
              >
                {msg.role === "assistant" ? (
                  parsedError ? (
                    <AssistantErrorCard error={parsedError} />
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                      <ReactMarkdown>{stripArtifacts(msg.content)}</ReactMarkdown>
                    </div>
                  )
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                {messageTime && (
                  <div
                    className={cn(
                      "mt-1 text-[10px] tabular-nums",
                      msg.role === "user" ? "text-background/70" : "text-muted-foreground"
                    )}
                  >
                    {messageTime}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="rounded-xl px-4 py-2.5 text-sm bg-secondary border border-border/60">
              <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                <ReactMarkdown>{stripArtifacts(streamingContent)}</ReactMarkdown>
              </div>
              <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                Streaming • {formatMessageTime(new Date().toISOString())}
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="rounded-xl px-4 py-2.5 text-sm bg-secondary border border-border/60">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t px-4 md:px-6 py-3 bg-background relative">
        {runningAgentTypes.length > 0 && (
          <div className="flex items-center justify-between gap-3 mb-2 p-2 rounded-lg border bg-secondary/30">
            <span className="text-xs text-muted-foreground">
              {runningAgentTypes.length} running {runningAgentTypes.length === 1 ? "agent" : "agents"}
            </span>
            <button
              onClick={handleStopAllRunningAgents}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </button>
          </div>
        )}

        {/* Connected repo indicator */}
        {repoUrl && (
          <div className="flex items-center gap-1.5 mb-2">
            <GitBranch className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-muted-foreground truncate max-w-[300px]">{repoUrl}</span>
          </div>
        )}

        {/* Repo connect prompt */}
        {showRepoPrompt && !repoUrl && (
          <div className="flex items-center gap-2 mb-2 p-2 rounded-lg border border-dashed border-muted-foreground/30 bg-secondary/30">
            <Link className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnectRepo()}
              placeholder="https://github.com/user/repo"
              className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />
            <button
              onClick={handleConnectRepo}
              disabled={!repoInput.trim() || connectingRepo}
              className="text-xs px-2 py-1 rounded bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              Connect
            </button>
            <button
              onClick={() => { setShowRepoPrompt(false); setRepoInput(""); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Context menu popup */}
        {contextMenu && (
          <ContextMenuPopup
            trigger={contextMenu.trigger}
            query={contextMenu.query}
            position={contextMenu.position}
            sessionId={sessionId}
            artifacts={artifacts}
            onSelect={handleContextMenuSelect}
            onDismiss={() => setContextMenu(null)}
          />
        )}

        <div className="flex items-center gap-2 rounded-xl border bg-secondary/50 px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-shadow">
          {/* + button with agent popup */}
          <div className="relative flex-shrink-0" ref={agentMenuRef}>
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showAgentMenu
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              )}
            >
              <Plus className="w-4 h-4" />
            </button>

            {showAgentMenu && (
              <div className="absolute bottom-full left-0 mb-3 w-56 max-h-[70vh] overflow-y-auto scrollbar-subtle rounded-xl border border-border bg-background shadow-xl py-1.5 z-[100]">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Agents
                </div>
                {AGENT_COMMANDS.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.prefix}
                      onClick={() => handleAgentTrigger(cmd.prefix, cmd.requiresRepo)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary transition-colors"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{cmd.label}</div>
                        <div className="text-[11px] text-muted-foreground">{cmd.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            rows={1}
            className="flex-1 resize-none bg-transparent py-1 text-base md:text-sm placeholder:text-muted-foreground focus:outline-none min-h-[28px] max-h-[160px]"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 160) + "px";
            }}
          />

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className={cn(
              "p-1.5 rounded-lg transition-colors flex-shrink-0",
              input.trim()
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "text-muted-foreground"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
