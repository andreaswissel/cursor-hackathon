import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Code2,
  Sparkles,
} from "lucide-react";

interface CursorHandoffProps {
  spec: string;
  codingPrompt?: string;
  ideaTitle: string;
}

export function CursorHandoff({ spec, codingPrompt, ideaTitle }: CursorHandoffProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Build the prompt for Cursor — use concise coding prompt when available, fall back to full spec
  const cursorPrompt = codingPrompt || `Implement this feature based on the following specification:\n\n# ${ideaTitle}\n\n${spec}\n\n---\n\nPlease implement this feature following best practices.`;

  // CLI command for terminal
  const cliCommand = `cursor agent "$(cat <<'EOF'
${cursorPrompt}
EOF
)"`;

  // Simple deeplink prompt (no markdown, just instruction)
  const simplePrompt = `Implement this feature: ${ideaTitle}. The full specification has been copied to your clipboard - please paste it to see the details.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(cursorPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  // Open in Cursor: copy full prompt to clipboard, then open with simple deeplink
  const handleOpenInCursor = () => {
    navigator.clipboard.writeText(cursorPrompt).then(() => {
      // Open Cursor with a simple prompt that tells user to paste
      const deeplink = `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(simplePrompt)}`;
      window.location.href = deeplink;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Code2 className="w-4 h-4 text-purple-500" />
        </div>
        <div>
          <p className="text-sm font-medium">Handoff to Cursor</p>
          <p className="text-xs text-muted-foreground">
            Continue with AI coding
          </p>
        </div>
      </div>

      {/* Main action button */}
      <div className={cn("relative", isOpen && "z-[120]")}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Open in Cursor
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown options */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-[130] rounded-lg border bg-card shadow-lg overflow-hidden">
            {/* Option 1: Open in Cursor App with prompt copied */}
            <button
              onClick={handleOpenInCursor}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              <ExternalLink className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Open in Cursor</p>
                <p className="text-xs text-muted-foreground">
                  Copies spec & opens Cursor chat. Just paste!
                </p>
              </div>
            </button>

            <div className="border-t" />

            {/* Option 2: Copy prompt */}
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
                  Copy the spec prompt to paste in Cursor
                </p>
              </div>
            </button>

            <div className="border-t" />

            {/* Option 3: CLI command */}
            <button
              onClick={handleCopyCli}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              {copiedCli ? (
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Terminal className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {copiedCli ? "Copied!" : "Copy CLI Command"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Run <code className="text-[10px] bg-secondary px-1 rounded">cursor agent</code> in your project
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Quick tip */}
      <p className="text-xs text-muted-foreground">
        Tip: Have your project open in Cursor, then paste (Cmd+V) the spec when prompted
      </p>
    </div>
  );
}
