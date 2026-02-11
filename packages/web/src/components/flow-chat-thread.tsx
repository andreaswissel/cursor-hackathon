import { useState, useRef, useEffect, useCallback } from "react";
import { chatWithAgent, getChatHistory } from "@/lib/api";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Loader2,
  Code2,
  ShieldCheck,
  User,
  Bot,
  GitBranch,
  Link,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface FlowChatThreadProps {
  sessionId: string;
  repoUrl?: string;
  onConnectRepo?: (url: string) => void;
}

export function FlowChatThread({ sessionId, repoUrl, onConnectRepo }: FlowChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showRepoPrompt, setShowRepoPrompt] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [connectingRepo, setConnectingRepo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const streamingContentRef = useRef("");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load chat history on mount
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
      })
      .catch(() => setIsLoading(false));
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSend = useCallback(
    (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text || isStreaming) return;

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
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: finalContent, createdAt: new Date().toISOString() },
          ]);
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
        }
      );
    },
    [input, isStreaming, sessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAgentTrigger = (agentPrefix: string) => {
    if (!repoUrl) {
      setShowRepoPrompt(true);
      return;
    }
    const currentInput = input.trim();
    const newInput = currentInput
      ? `${agentPrefix} ${currentInput}`
      : `${agentPrefix} `;
    setInput(newInput);
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
              Start a conversation to plan, build, and ship. Use @Code or @Review to trigger specialized agents.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
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
        ))}

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

        {isStreaming && !streamingContent && (
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
      <div className="border-t px-4 md:px-6 py-3 bg-background">
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

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              rows={1}
              className="w-full resize-none rounded-xl border bg-secondary/50 px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-[160px]"
              style={{ height: "auto", overflow: "hidden" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 160) + "px";
              }}
              disabled={isStreaming}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors",
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

        {/* Agent trigger buttons */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => handleAgentTrigger("@Code")}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Code2 className="w-3.5 h-3.5" />
            @Code
          </button>
          <button
            onClick={() => handleAgentTrigger("@Review")}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            @Review
          </button>
        </div>
      </div>
    </div>
  );
}
