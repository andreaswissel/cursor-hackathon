import { cn } from "@/lib/utils";
import { FileText, Video } from "lucide-react";
import type { SessionMode } from "@product-os/shared";

interface ModeSwitcherProps {
  mode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  disabled?: boolean;
}

export function ModeSwitcher({ mode, onModeChange, disabled }: ModeSwitcherProps) {
  return (
    <div className="inline-flex p-1 bg-secondary rounded-lg">
      <button
        onClick={() => onModeChange("idea-to-spec")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          mode === "idea-to-spec"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <FileText className="w-4 h-4" />
        Idea to Spec
      </button>
      <button
        onClick={() => onModeChange("documentation")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          mode === "documentation"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Video className="w-4 h-4" />
        Documentation
      </button>
    </div>
  );
}
