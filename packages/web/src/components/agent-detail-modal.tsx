import { useState, useEffect, useRef, useCallback } from "react";
import type { AgentState, AgentType } from "@product-os/shared";
import { cn } from "@/lib/utils";
import { chatWithAgent, getChatHistory } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Target,
  FileText,
  Megaphone,
  Compass,
  Share2,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  agentType: AgentType;
  agent: AgentState | undefined;
  onMessageSent?: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

const AGENT_CONFIG: Record<
  AgentType,
  { name: string; description: string; icon: typeof Sparkles; color: string }
> = {
  orchestrator: {
    name: "Orchestrator",
    description: "Coordinates the overall workflow",
    icon: Compass,
    color: "text-slate-500",
  },
  discovery: {
    name: "Discovery Agent",
    description: "Validates problems against customer feedback",
    icon: Sparkles,
    color: "text-amber-500",
  },
  strategy: {
    name: "Strategy Agent",
    description: "Analyzes OKR alignment and prioritization",
    icon: Target,
    color: "text-blue-500",
  },
  spec: {
    name: "Spec Writer",
    description: "Creates detailed feature specifications",
    icon: FileText,
    color: "text-emerald-500",
  },
  gtm: {
    name: "GTM Agent",
    description: "Develops launch materials and messaging",
    icon: Megaphone,
    color: "text-orange-500",
  },
  "product-marketing": {
    name: "Product Marketing",
    description: "Creates internal product updates",
    icon: Share2,
    color: "text-violet-500",
  },
};

export function AgentDetailModal({
  isOpen,
  onClose,
  sessionId,
  agentType,
  agent,
  onMessageSent,
}: AgentDetailModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const config = AGENT_CONFIG[agentType];
  const Icon = config.icon;

  // Load chat history when modal opens
  useEffect(() => {
    if (isOpen && sessionId && agentType) {
      setIsLoadingHistory(true);
      getChatHistory(sessionId, agentType)
        .then(({ messages: history }) => {
          setMessages(
            history.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: m.createdAt,
            }))
          );
        })
        .catch(console.error)
        .finally(() => setIsLoadingHistory(false));
    }
  }, [isOpen, sessionId, agentType]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current();
      }
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Start streaming
    abortRef.current = chatWithAgent(
      sessionId,
      agentType,
      userMessage,
      (text) => {
        setStreamingContent((prev) => prev + text);
      },
      () => {
        // On complete - move streaming content to messages
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: streamingContent || "" },
        ]);
        setStreamingContent("");
        setIsLoading(false);
        onMessageSent?.();
      },
      (error) => {
        console.error("Chat error:", error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${error}` },
        ]);
        setStreamingContent("");
        setIsLoading(false);
      }
    );
  }, [input, isLoading, sessionId, agentType, onMessageSent, streamingContent]);

  // Update the complete handler to use current streamingContent
  useEffect(() => {
    if (!isLoading && streamingContent) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: streamingContent },
      ]);
      setStreamingContent("");
    }
  }, [isLoading, streamingContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get formatted output from agent.output
  const getFormattedOutput = (): string | null => {
    if (!agent?.output) return null;

    // Handle different output formats
    if (typeof agent.output === "string") {
      return agent.output;
    }

    // Spec agent returns { markdown: string }
    if (
      typeof agent.output === "object" &&
      "markdown" in (agent.output as object)
    ) {
      return (agent.output as { markdown: string }).markdown;
    }

    // Other agents might have reasoning
    if (
      typeof agent.output === "object" &&
      "reasoning" in (agent.output as object)
    ) {
      return (agent.output as { reasoning: string }).reasoning;
    }

    // Check for problemValidation (discovery agent)
    if (
      typeof agent.output === "object" &&
      "problemValidation" in (agent.output as object)
    ) {
      const pv = (agent.output as { problemValidation: { reasoning?: string } }).problemValidation;
      if (pv?.reasoning) return pv.reasoning;
    }

    // Fallback to JSON for non-empty objects
    if (typeof agent.output === "object" && Object.keys(agent.output as object).length > 0) {
      return "```json\n" + JSON.stringify(agent.output, null, 2) + "\n```";
    }

    return null;
  };

  // Get logs content as fallback
  const getLogsContent = (): string | null => {
    if (!agent?.logs || agent.logs.length === 0) return null;
    return agent.logs.map((l) => l.content).join("");
  };

  const formattedOutput = getFormattedOutput();
  const logsContent = getLogsContent();
  const displayContent = formattedOutput || logsContent;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm",
          "animate-in fade-in duration-200"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full md:w-[600px] lg:w-[720px] h-full",
          "bg-background border-l flex flex-col",
          "animate-in slide-in-from-right duration-300"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card/50">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                "bg-secondary"
              )}
            >
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            <div>
              <h2 className="font-semibold">{config.name}</h2>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Agent Output Section */}
          {displayContent && (
            <div className="p-6 border-b">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {formattedOutput ? "Current Output" : "Agent Log"}
                </span>
              </div>
              <div className={cn(
                "prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-xs prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
                !formattedOutput && "font-mono text-xs whitespace-pre-wrap"
              )}>
                {formattedOutput ? (
                  <ReactMarkdown>{displayContent}</ReactMarkdown>
                ) : (
                  <div className="text-muted-foreground">{displayContent}</div>
                )}
              </div>
            </div>
          )}

          {/* Chat Section */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Refine with Chat
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 && !streamingContent ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">
                    Ask questions or request changes to refine the output
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "Make it more concise",
                      "Add more detail",
                      "Change the tone",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-1.5 text-xs rounded-full border hover:bg-secondary transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5",
                          message.role === "user"
                            ? "bg-foreground text-background rounded-br-md"
                            : "bg-secondary rounded-bl-md"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none prose-p:text-foreground prose-p:my-1 prose-li:text-foreground prose-strong:text-foreground">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Streaming message */}
                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5">
                        <div className="prose prose-sm max-w-none prose-p:text-foreground prose-p:my-1">
                          <ReactMarkdown>{streamingContent}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t bg-card/50 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${config.name} to refine the output...`}
                rows={1}
                className={cn(
                  "w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12",
                  "text-sm placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:ring-2 focus:ring-foreground/10",
                  "max-h-32 min-h-[48px]"
                )}
                style={{
                  height: "auto",
                  minHeight: "48px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-2 bottom-2 p-2 rounded-lg",
                  "transition-all duration-150",
                  input.trim() && !isLoading
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
