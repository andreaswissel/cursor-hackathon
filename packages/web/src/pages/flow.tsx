import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createFlowSession, getAllProjects } from "@/lib/api";
import { Sidebar } from "@/components/sidebar";
import { ContextMenuPopup } from "@/components/context-menu-popup";
import type { ProjectWithSessions } from "@product-os/shared";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Bot,
  Send,
  Plus,
  Code2,
  ShieldCheck,
  FileText,
  Target,
  Search,
  Megaphone,
  Newspaper,
  ScrollText,
} from "lucide-react";

const AGENT_COMMANDS = [
  { prefix: "@Code", label: "Code", description: "Implement code changes", icon: Code2 },
  { prefix: "@Review", label: "Review", description: "Review code for issues", icon: ShieldCheck },
  { prefix: "@Spec", label: "Spec", description: "Write a feature spec", icon: FileText },
  { prefix: "@Strategy", label: "Strategy", description: "Assess strategic fit", icon: Target },
  { prefix: "@Discovery", label: "Discovery", description: "Run discovery research", icon: Search },
  { prefix: "@GTM", label: "GTM", description: "Plan go-to-market", icon: Megaphone },
  { prefix: "@Marketing", label: "Marketing", description: "Write product update", icon: Newspaper },
  { prefix: "@Changelog", label: "Changelog", description: "Write changelog entries", icon: ScrollText },
];

export function FlowPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    trigger: "@" | "$" | "#";
    query: string;
    position: { bottom: number; left: number };
  } | null>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleSend = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { sessionId } = await createFlowSession(text);
      // Store the pending message for auto-send on mount
      sessionStorage.setItem(`flow-pending-${sessionId}`, text);
      navigate(`/session/${sessionId}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If context menu is open, let it handle keyboard
    if (contextMenu) {
      if (e.key === "Escape") {
        e.preventDefault();
        setContextMenu(null);
        return;
      }
      if (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAgentTrigger = (agentPrefix: string) => {
    const currentInput = input.trim();
    const newInput = currentInput
      ? `${agentPrefix} ${currentInput}`
      : `${agentPrefix} `;
    setInput(newInput);
    setShowAgentMenu(false);
    inputRef.current?.focus();
  };

  // Handle input change with context menu detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

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
      replacement = item.id + " ";
    }

    const newInput = input.slice(0, triggerStart) + replacement + textAfterCursor;
    setInput(newInput);
    setContextMenu(null);
    inputRef.current.focus();
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        projects={projects}
        onProjectCreated={refreshProjects}
        onProjectDeleted={refreshProjects}
        onSessionDeleted={refreshProjects}
      />

      <main className="flex-1 flex flex-col pt-14 md:pt-0 overflow-hidden">
        {/* Empty state centered content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h1 className="text-lg font-semibold mb-1">Flow Mode</h1>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            Start a conversation to plan, build, and ship. Use @ to trigger agents.
          </p>
        </div>

        {/* Input area pinned to bottom */}
        <div className="border-t px-4 md:px-6 py-3 bg-background relative">
          {error && (
            <div className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-600 mb-2">
              {error}
            </div>
          )}

          {/* Context menu popup */}
          {contextMenu && (
            <ContextMenuPopup
              trigger={contextMenu.trigger}
              query={contextMenu.query}
              position={contextMenu.position}
              sessionId=""
              onSelect={handleContextMenuSelect}
              onDismiss={() => setContextMenu(null)}
            />
          )}

          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 rounded-xl border bg-secondary/50 px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-shadow">
              {/* + button with agent popup */}
              <div className="relative flex-shrink-0" ref={agentMenuRef}>
                <button
                  onClick={() => setShowAgentMenu(!showAgentMenu)}
                  disabled={isLoading}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors disabled:opacity-50",
                    showAgentMenu
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>

                {showAgentMenu && (
                  <div className="absolute bottom-full left-0 mb-3 w-56 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-background shadow-xl py-1.5 z-[100]">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                      Agents
                    </div>
                    {AGENT_COMMANDS.map((cmd) => {
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.prefix}
                          onClick={() => handleAgentTrigger(cmd.prefix)}
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
                className="flex-1 resize-none bg-transparent py-1 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[28px] max-h-[160px]"
                style={{ height: "auto", overflow: "hidden" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 160) + "px";
                }}
                disabled={isLoading}
              />

              {/* Send button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-1.5 rounded-lg transition-colors flex-shrink-0",
                  input.trim() && !isLoading
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "text-muted-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
