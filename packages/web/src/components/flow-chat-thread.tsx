import { useState, useRef, useEffect, useCallback } from "react";
import { chatWithAgent, getChatHistory } from "@/lib/api";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { CollapsibleThinking } from "./collapsible-thinking";
import { ContextMenuPopup } from "./context-menu-popup";
import {
  Send,
  Loader2,
  Plus,
  Code2,
  ShieldCheck,
  User,
  Bot,
  GitBranch,
  Link,
  Search,
  Target,
  FileText,
  Megaphone,
  Newspaper,
  ScrollText,
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

interface FlowChatThreadProps {
  sessionId: string;
  repoUrl?: string;
  onConnectRepo?: (url: string) => void;
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

export function FlowChatThread({ sessionId, repoUrl, onConnectRepo }: FlowChatThreadProps) {
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
  const streamingContentRef = useRef("");
  const thinkingRef = useRef<AgentThinking | null>(null);

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

  const handleSend = useCallback(
    (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text || isStreaming) return;

      // Dismiss context menu
      setContextMenu(null);

      const userMessage: ChatMessage = {
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);
      setStreamingContent("");
      streamingContentRef.current = "";
      thinkingRef.current = null;

      abortRef.current = chatWithAgent(
        sessionId,
        "flow-orchestrator",
        text,
        (chunk) => {
          streamingContentRef.current += chunk;
          setStreamingContent(streamingContentRef.current);
        },
        () => {
          const finalContent = streamingContentRef.current;
          if (finalContent) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: finalContent, createdAt: new Date().toISOString() },
            ]);
          }
          setStreamingContent("");
          streamingContentRef.current = "";
          setIsStreaming(false);
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
          setStreamingContent("");
          streamingContentRef.current = "";
          setIsStreaming(false);
        },
        {
          onAgentThinkingStart: (agentType, agentLabel) => {
            const thinking: AgentThinking = {
              agentType,
              agentLabel,
              logs: [],
              status: "running",
            };
            thinkingRef.current = thinking;
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "",
                createdAt: new Date().toISOString(),
                agentThinking: { ...thinking },
              },
            ]);
          },
          onThinking: (content) => {
            if (thinkingRef.current) {
              thinkingRef.current.logs.push(content);
              setMessages((prev) =>
                prev.map((m) =>
                  m.agentThinking
                    ? { ...m, agentThinking: { ...m.agentThinking, logs: [...thinkingRef.current!.logs] } }
                    : m
                )
              );
            }
          },
          onAgentThinkingEnd: (_agentType, status) => {
            if (thinkingRef.current) {
              thinkingRef.current.status = status as "completed" | "failed";
              setMessages((prev) =>
                prev.map((m) =>
                  m.agentThinking
                    ? { ...m, agentThinking: { ...m.agentThinking, status: status as "completed" | "failed" } }
                    : m
                )
              );
            }
          },
        }
      );
    },
    [input, isStreaming, sessionId]
  );

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
    const match = textBeforeCursor.match(/([@$#])(\w*)$/);

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

  const handleContextMenuSelect = (item: { id: string; label: string }) => {
    if (!contextMenu || !inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPos);
    const match = textBeforeCursor.match(/([@$#])(\w*)$/);

    if (!match) return;

    const triggerStart = cursorPos - match[0].length;
    const textAfterCursor = input.slice(cursorPos);
    let replacement = "";

    if (contextMenu.trigger === "@") {
      replacement = `@${item.label} `;
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
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Flow Mode</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Start a conversation to plan, build, and ship. Use @ to trigger agents, $ to reference sessions, # for skills.
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
                />
              </div>
            );
          }

          // Skip empty assistant messages (thinking placeholders with no text content)
          if (msg.role === "assistant" && !msg.content) return null;

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
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-secondary"
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-secondary"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                    <ReactMarkdown>{stripArtifacts(msg.content)}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="rounded-xl px-4 py-2.5 text-sm bg-secondary">
              <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                <ReactMarkdown>{stripArtifacts(streamingContent)}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && !thinkingRef.current && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="rounded-xl px-4 py-2.5 text-sm bg-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t px-4 md:px-6 py-3 bg-background relative">
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
            onSelect={handleContextMenuSelect}
            onDismiss={() => setContextMenu(null)}
          />
        )}

        <div className="flex items-center gap-2 rounded-xl border bg-secondary/50 px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-shadow">
          {/* + button with agent popup */}
          <div className="relative flex-shrink-0" ref={agentMenuRef}>
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              disabled={isStreaming}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>

            {showAgentMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 max-h-[70vh] overflow-y-auto rounded-xl border bg-popover shadow-lg py-1.5 z-50">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Agents
                </div>
                {AGENT_COMMANDS.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.prefix}
                      onClick={() => handleAgentTrigger(cmd.prefix, cmd.requiresRepo)}
                      disabled={isStreaming}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary transition-colors disabled:opacity-50"
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
            className="flex-1 resize-none bg-transparent py-1 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[28px] max-h-[160px]"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 160) + "px";
            }}
            disabled={isStreaming}
          />

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className={cn(
              "p-1.5 rounded-lg transition-colors flex-shrink-0",
              input.trim() && !isStreaming
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "text-muted-foreground"
            )}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
