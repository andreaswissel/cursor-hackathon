import { useState } from "react";
import { isTauri } from "@/lib/platform";
import { loadDesktopModule } from "@/lib/desktop-loader";
import { CursorHandoff } from "@/components/cursor-handoff";
import { cn } from "@/lib/utils";
import {
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Code2,
  FolderOpen,
} from "lucide-react";

interface ClaudeCodeHandoffProps {
  spec: string;
  codingPrompt?: string;
  ideaTitle: string;
  cwd?: string;
  onTerminalOpen: (command: string, cwd?: string) => void;
}

export function ClaudeCodeHandoff({
  spec,
  codingPrompt,
  ideaTitle,
  cwd,
  onTerminalOpen,
}: ClaudeCodeHandoffProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedCwd, setSelectedCwd] = useState<string | undefined>(cwd);

  // Fall back to CursorHandoff when not in Tauri
  if (!isTauri()) {
    return <CursorHandoff spec={spec} codingPrompt={codingPrompt} ideaTitle={ideaTitle} />;
  }

  const prompt = codingPrompt || `Implement this feature based on the following specification:\n\n# ${ideaTitle}\n\n${spec}\n\n---\n\nPlease implement this feature following best practices.`;

  const handlePickDirectory = async () => {
    try {
      const { open } = await loadDesktopModule<{ open: (options?: Record<string, unknown>) => Promise<string | null> }>("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setSelectedCwd(selected as string);
      }
    } catch {
      // User cancelled or error
    }
  };

  const handleRunClaudeCode = () => {
    const promptText = codingPrompt || `Implement: ${ideaTitle}. See the spec pasted below:\\n\\n${spec.substring(0, 2000)}`;
    const escapedPrompt = promptText
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    const command = `claude "${escapedPrompt}"`;
    onTerminalOpen(command, selectedCwd);
    setIsOpen(false);
  };

  const handleRunCodex = () => {
    const escapedTitle = ideaTitle.replace(/"/g, '\\"');
    const command = `codex "Implement: ${escapedTitle}"`;
    onTerminalOpen(command, selectedCwd);
    setIsOpen(false);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleOpenInCursor = () => {
    const simplePrompt = `Implement this feature: ${ideaTitle}. The full specification has been copied to your clipboard - please paste it to see the details.`;
    navigator.clipboard.writeText(prompt).then(() => {
      const deeplink = `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(simplePrompt)}`;
      window.location.href = deeplink;
    });
    setIsOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Code2 className="w-4 h-4 text-purple-500" />
        </div>
        <div>
          <p className="text-sm font-medium">Build with AI</p>
          <p className="text-xs text-muted-foreground">
            Hand off to Claude Code, Codex, or Cursor
          </p>
        </div>
      </div>

      {/* Directory selector */}
      <button
        onClick={handlePickDirectory}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm hover:bg-secondary transition-colors w-full text-left"
      >
        <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate text-muted-foreground">
          {selectedCwd || "Select project directory..."}
        </span>
      </button>

      {/* Main dropdown button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-500" />
            Build this spec
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-20 rounded-lg border bg-card shadow-lg overflow-hidden">
            {/* Claude Code */}
            <button
              onClick={handleRunClaudeCode}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              <Terminal className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Run with Claude Code</p>
                <p className="text-xs text-muted-foreground">
                  Opens terminal with{" "}
                  <code className="text-[10px] bg-secondary px-1 rounded">
                    claude
                  </code>{" "}
                  command
                </p>
              </div>
            </button>

            <div className="border-t" />

            {/* Codex */}
            <button
              onClick={handleRunCodex}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              <Terminal className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Run with Codex</p>
                <p className="text-xs text-muted-foreground">
                  Opens terminal with{" "}
                  <code className="text-[10px] bg-secondary px-1 rounded">
                    codex
                  </code>{" "}
                  command
                </p>
              </div>
            </button>

            <div className="border-t" />

            {/* Cursor */}
            <button
              onClick={handleOpenInCursor}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Open in Cursor</p>
                <p className="text-xs text-muted-foreground">
                  Copies spec & opens Cursor chat
                </p>
              </div>
            </button>

            <div className="border-t" />

            {/* Copy prompt */}
            <button
              onClick={handleCopyPrompt}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              {copiedPrompt ? (
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {copiedPrompt ? "Copied!" : "Copy Prompt"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Copy the spec prompt to clipboard
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Select a project directory, then choose how to build
      </p>
    </div>
  );
}
