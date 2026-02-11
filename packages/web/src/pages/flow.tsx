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
  Code2,
  ShieldCheck,
  FileText,
  Target,
  Search,
  Megaphone,
  Newspaper,
  ScrollText,
} from "lucide-react";

const AGENT_BUTTONS = [
  { prefix: "@Code", label: "@Code", icon: Code2 },
  { prefix: "@Review", label: "@Review", icon: ShieldCheck },
  { prefix: "@Spec", label: "@Spec", icon: FileText },
  { prefix: "@Strategy", label: "@Strategy", icon: Target },
  { prefix: "@Discovery", label: "@Discovery", icon: Search },
  { prefix: "@GTM", label: "@GTM", icon: Megaphone },
  { prefix: "@Marketing", label: "@Marketing", icon: Newspaper },
  { prefix: "@Changelog", label: "@Changelog", icon: ScrollText },
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
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
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
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

            {/* Agent trigger buttons */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {AGENT_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.prefix}
                    onClick={() => handleAgentTrigger(btn.prefix)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <Icon className="w-3 h-3" />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
