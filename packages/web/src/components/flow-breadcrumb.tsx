import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import type { ProjectWithSessions } from "@product-os/shared";
import { cn } from "@/lib/utils";

interface FlowBreadcrumbProps {
  sessionId: string;
  title: string;
  projectId?: string;
  projects: ProjectWithSessions[];
  onProjectAssigned: (projectId: string) => void;
}

export function FlowBreadcrumb({
  title,
  projectId,
  projects,
  onProjectAssigned,
}: FlowBreadcrumbProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find((p) => p.id === projectId);
  const projectName = currentProject?.name || "Drafts";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="truncate max-w-[120px]">{projectName}</span>
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-background shadow-xl z-[100] py-1">
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Assign to project
            </div>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onProjectAssigned(p.id);
                  setShowDropdown(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors flex items-center gap-2",
                  p.id === projectId && "text-foreground font-medium"
                )}
              >
                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="font-semibold text-sm truncate">{title}</span>
    </div>
  );
}
