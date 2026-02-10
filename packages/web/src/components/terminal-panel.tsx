import { useEffect, useRef, useState, useCallback } from "react";
import { isTauri } from "@/lib/platform";
import { Terminal as TerminalIcon, X, Minus, Maximize2 } from "lucide-react";

interface TerminalPanelProps {
  visible: boolean;
  cwd?: string;
  initialCommand?: string;
  onClose: () => void;
}

// Ghostty default theme (One Dark inspired)
const GHOSTTY_THEME = {
  background: "#282c34",
  foreground: "#ffffff",
  cursor: "#528bff",
  cursorAccent: "#282c34",
  selectionBackground: "#3e4451",
  selectionForeground: "#ffffff",
  black: "#282c34",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#abb2bf",
  brightBlack: "#5c6370",
  brightRed: "#e06c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#ffffff",
};

export function TerminalPanel({
  visible,
  cwd,
  initialCommand,
  onClose,
}: TerminalPanelProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const unlistenersRef = useRef<(() => void)[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [height, setHeight] = useState(360);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const cleanup = useCallback(async () => {
    // Clean up event listeners
    for (const unlisten of unlistenersRef.current) {
      unlisten();
    }
    unlistenersRef.current = [];

    if (sessionIdRef.current && isTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("pty_kill", { sessionId: sessionIdRef.current });
      } catch {
        // ignore cleanup errors
      }
      sessionIdRef.current = null;
    }
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    fitAddonRef.current = null;
  }, []);

  useEffect(() => {
    if (!visible || !termRef.current || !isTauri()) return;

    let cancelled = false;

    async function init() {
      const [
        { Terminal },
        { FitAddon },
        { WebLinksAddon },
        { CanvasAddon },
        { invoke },
        { listen },
      ] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
        import("@xterm/addon-canvas"),
        import("@tauri-apps/api/core"),
        import("@tauri-apps/api/event"),
      ]);

      // Import CSS
      await import("@xterm/xterm/css/xterm.css");

      if (cancelled) return;

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;

      const term = new Terminal({
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        allowProposedApi: true,
        scrollback: 10000,
        theme: GHOSTTY_THEME,
      });

      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      if (termRef.current) {
        term.open(termRef.current);
        // Load canvas renderer after open for hardware-accelerated rendering
        term.loadAddon(new CanvasAddon());
        fitAddon.fit();
      }

      xtermRef.current = term;

      // Get the fitted size to use for PTY spawn
      const cols = term.cols;
      const rows = term.rows;

      // Spawn PTY with matched terminal size
      const sessionId: string = await invoke("pty_spawn", {
        command: null,
        args: null,
        cwd: cwd || null,
      });
      sessionIdRef.current = sessionId;

      // Immediately resize PTY to match terminal dimensions
      await invoke("pty_resize", {
        sessionId,
        cols,
        rows,
      });

      // Listen for PTY data
      const unlistenData = await listen<{ session_id: string; data: string }>(
        "pty:data",
        (event) => {
          if (event.payload.session_id === sessionId && xtermRef.current) {
            xtermRef.current.write(event.payload.data);
          }
        }
      );

      // Listen for PTY exit
      const unlistenExit = await listen<{ session_id: string }>(
        "pty:exit",
        (event) => {
          if (event.payload.session_id === sessionId && xtermRef.current) {
            xtermRef.current.write(
              "\r\n\x1b[90m[Process exited]\x1b[0m\r\n"
            );
          }
        }
      );

      unlistenersRef.current = [unlistenData, unlistenExit];

      // Send input to PTY
      term.onData((data: string) => {
        if (sessionIdRef.current) {
          invoke("pty_write", { sessionId: sessionIdRef.current, data });
        }
      });

      // Handle resize — sync PTY size when terminal resizes
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        if (sessionIdRef.current) {
          invoke("pty_resize", {
            sessionId: sessionIdRef.current,
            cols,
            rows,
          });
        }
      });

      // Send initial command if provided
      if (initialCommand) {
        // Wait for shell to initialize before sending command
        setTimeout(() => {
          if (sessionIdRef.current) {
            invoke("pty_write", {
              sessionId: sessionIdRef.current,
              data: initialCommand + "\n",
            });
          }
        }, 800);
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [visible, cwd, initialCommand, cleanup]);

  // Resize observer — refit terminal when container size changes
  useEffect(() => {
    if (!visible || isMinimized) return;

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch {
          // ignore fit errors during transitions
        }
      }
    };

    const observer = new ResizeObserver(handleResize);
    if (termRef.current) {
      observer.observe(termRef.current);
    }

    return () => observer.disconnect();
  }, [visible, isMinimized, height]);

  // Drag resize handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = height;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startY.current - e.clientY;
        const newHeight = Math.max(150, Math.min(700, startHeight.current + delta));
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        // Refit terminal after drag resize completes
        requestAnimationFrame(() => {
          if (fitAddonRef.current) {
            try {
              fitAddonRef.current.fit();
            } catch {
              // ignore
            }
          }
        });
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height]
  );

  if (!visible) return null;

  if (!isTauri()) {
    return (
      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TerminalIcon className="w-4 h-4" />
          <span className="text-sm">
            Terminal is available in the desktop app.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-t flex flex-col"
      style={{
        height: isMinimized ? 36 : height,
        backgroundColor: GHOSTTY_THEME.background,
      }}
    >
      {/* Drag handle */}
      <div
        className="h-1 cursor-row-resize hover:bg-blue-500/50 transition-colors flex-shrink-0"
        style={{ backgroundColor: "#181a1f" }}
        onMouseDown={handleMouseDown}
      />

      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-1 border-b flex-shrink-0"
        style={{
          backgroundColor: "#21252b",
          borderColor: "#181a1f",
        }}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5" style={{ color: "#abb2bf" }} />
          <span
            className="text-xs font-medium"
            style={{ color: "#abb2bf" }}
          >
            Terminal
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsMinimized(!isMinimized);
              if (isMinimized) {
                // Refit after restoring
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    try {
                      fitAddonRef.current?.fit();
                    } catch {
                      // ignore
                    }
                  }, 50);
                });
              }
            }}
            className="p-1 rounded transition-colors"
            style={{ color: "#abb2bf" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#3e4451")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="p-1 rounded transition-colors"
            style={{ color: "#abb2bf" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#3e4451")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal area */}
      {!isMinimized && (
        <div
          ref={termRef}
          className="flex-1 overflow-hidden"
          style={{ padding: "4px 0 0 4px" }}
        />
      )}
    </div>
  );
}
