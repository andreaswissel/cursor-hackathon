import { useState, useEffect, useRef, useCallback } from "react";
import type { AgentState, AgentType } from "@product-os/shared";
import { cn } from "@/lib/utils";
import { chatWithAgent, getChatHistory } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import {
  X,
  Loader2,
  Sparkles,
  Target,
  FileText,
  Megaphone,
  Compass,
  Share2,
  MessageSquare,
  ArrowRight,
  Zap,
  Video,
  BookOpen,
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
  { name: string; description: string; icon: typeof Sparkles; color: string; gradient: string }
> = {
  orchestrator: {
    name: "Orchestrator",
    description: "Coordinates the overall workflow",
    icon: Compass,
    color: "text-slate-500",
    gradient: "from-slate-500/20 to-slate-600/5",
  },
  discovery: {
    name: "Discovery Agent",
    description: "Validates problems against customer feedback",
    icon: Sparkles,
    color: "text-amber-500",
    gradient: "from-amber-500/20 to-orange-600/5",
  },
  strategy: {
    name: "Strategy Agent",
    description: "Analyzes OKR alignment and prioritization",
    icon: Target,
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-indigo-600/5",
  },
  spec: {
    name: "Spec Writer",
    description: "Creates detailed feature specifications",
    icon: FileText,
    color: "text-emerald-500",
    gradient: "from-emerald-500/20 to-teal-600/5",
  },
  gtm: {
    name: "GTM Agent",
    description: "Develops launch materials and messaging",
    icon: Megaphone,
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-red-600/5",
  },
  "product-marketing": {
    name: "Product Marketing",
    description: "Creates internal product updates",
    icon: Share2,
    color: "text-violet-500",
    gradient: "from-violet-500/20 to-purple-600/5",
  },
  "doc-orchestrator": {
    name: "Doc Orchestrator",
    description: "Coordinates documentation workflow",
    icon: Compass,
    color: "text-slate-500",
    gradient: "from-slate-500/20 to-slate-600/5",
  },
  transcription: {
    name: "Transcription",
    description: "Extracts content from video",
    icon: Video,
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-indigo-600/5",
  },
  "doc-generator": {
    name: "Doc Generator",
    description: "Creates documentation pieces",
    icon: BookOpen,
    color: "text-emerald-500",
    gradient: "from-emerald-500/20 to-teal-600/5",
  },
  "flow-orchestrator": {
    name: "Flow Orchestrator",
    description: "Orchestrates flow mode conversations",
    icon: Compass,
    color: "text-violet-500",
    gradient: "from-violet-500/20 to-purple-600/5",
  },
  "code-agent": {
    name: "Code Agent",
    description: "Implements features and writes code",
    icon: Zap,
    color: "text-emerald-500",
    gradient: "from-emerald-500/20 to-teal-600/5",
  },
  "review-agent": {
    name: "Review Agent",
    description: "Reviews code and provides feedback",
    icon: MessageSquare,
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-indigo-600/5",
  },
  "changelog-agent": {
    name: "Changelog Agent",
    description: "Writes user-facing changelog entries",
    icon: FileText,
    color: "text-rose-500",
    gradient: "from-rose-500/20 to-pink-600/5",
  },
  "guided-tours-agent": {
    name: "Guided Tours Agent",
    description: "Designs step-by-step product tours",
    icon: FileText,
    color: "text-emerald-500",
    gradient: "from-emerald-500/20 to-teal-600/5",
  },
  "feedback-forms-agent": {
    name: "Feedback Forms Agent",
    description: "Creates targeted feedback forms",
    icon: MessageSquare,
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-amber-600/5",
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
  const streamingContentRef = useRef("");

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
    streamingContentRef.current = "";
    abortRef.current = chatWithAgent(
      sessionId,
      agentType,
      userMessage,
      (text) => {
        streamingContentRef.current += text;
        setStreamingContent(streamingContentRef.current);
      },
      () => {
        // On complete - move streaming content to messages using ref for current value
        const finalContent = streamingContentRef.current;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: finalContent },
        ]);
        streamingContentRef.current = "";
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
        streamingContentRef.current = "";
        setStreamingContent("");
        setIsLoading(false);
      }
    );
  }, [input, isLoading, sessionId, agentType, onMessageSent]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-md",
          "animate-in fade-in duration-200"
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-5xl h-[90vh] max-h-[900px]",
          "bg-background rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "animate-in zoom-in-95 fade-in duration-300",
          "ring-1 ring-white/10"
        )}
      >
        {/* Gradient header background */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-32 bg-gradient-to-b opacity-50 pointer-events-none",
          config.gradient
        )} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 md:px-8 py-5 border-b bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br shadow-lg",
                config.gradient
              )}
            >
              <Icon className={cn("w-6 h-6", config.color)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{config.name}</h2>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-secondary/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column layout on desktop */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Output Section */}
          <div className="flex-1 overflow-y-auto border-b md:border-b-0 md:border-r">
            {displayContent ? (
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className={cn("w-2 h-2 rounded-full", config.color.replace("text-", "bg-"))} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {formattedOutput ? "Generated Output" : "Agent Log"}
                  </span>
                </div>
                <div className={cn(
                  "prose prose-sm max-w-none",
                  "prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight",
                  "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
                  "prose-p:text-muted-foreground prose-p:leading-relaxed",
                  "prose-li:text-muted-foreground",
                  "prose-strong:text-foreground prose-strong:font-semibold",
                  "prose-code:text-xs prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
                  "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto",
                  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs [&_pre_code]:text-foreground/90",
                  !formattedOutput && "font-mono text-xs whitespace-pre-wrap text-muted-foreground"
                )}>
                  {formattedOutput ? (
                    <ReactMarkdown>{displayContent}</ReactMarkdown>
                  ) : (
                    <div>{displayContent}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-7 h-7 text-muted-foreground/50 animate-spin" />
                  </div>
                  <p className="text-muted-foreground">Generating output...</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Chat Section */}
          <div className="w-full md:w-[400px] flex flex-col bg-secondary/20">
            {/* Chat Header */}
            <div className="px-5 py-4 border-b bg-card/30">
              <div className="flex items-center gap-2">
                <Zap className={cn("w-4 h-4", config.color)} />
                <span className="text-sm font-semibold">Refine Output</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chat with the agent to iterate on results
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 && !streamingContent ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask questions or request changes
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      "Make it more concise",
                      "Add more technical detail",
                      "Focus on user benefits",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-4 py-2 text-xs rounded-lg border bg-card hover:bg-secondary transition-colors text-left"
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
                          "max-w-[90%] rounded-2xl px-4 py-2.5",
                          message.role === "user"
                            ? "bg-foreground text-background rounded-br-md"
                            : "bg-card border rounded-bl-md"
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
                      <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-card border px-4 py-2.5">
                        <div className="prose prose-sm max-w-none prose-p:text-foreground prose-p:my-1">
                          <ReactMarkdown>{streamingContent}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md bg-card border px-4 py-3">
                        <div className="flex items-center gap-1.5">
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

            {/* Input Area */}
            <div className="border-t bg-card/50 p-4">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for changes..."
                  rows={1}
                  className={cn(
                    "w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12",
                    "text-sm placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-2 focus:ring-foreground/10",
                    "max-h-28 min-h-[48px]"
                  )}
                  style={{
                    height: "auto",
                    minHeight: "48px",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 112) + "px";
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-2 bottom-2 p-2 rounded-lg",
                    "transition-all duration-150",
                    input.trim() && !isLoading
                      ? cn("bg-gradient-to-r shadow-md", config.gradient.replace("/20", "").replace("/5", ""), "text-white")
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
              <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
                Enter to send · Shift+Enter for new line · Esc to close
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                Do not include sensitive personal data.{" "}
                <a href="/restricted-data" className="underline hover:text-foreground transition-colors">
                  Restricted data notice
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
