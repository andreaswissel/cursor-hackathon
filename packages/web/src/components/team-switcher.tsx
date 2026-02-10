import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { ChevronDown, Users, Plus, Check } from "lucide-react";

export function TeamSwitcher() {
  const { user, activeTeamId, setActiveTeam } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const teams = user?.teams ?? [];
  const activeTeam = teams.find((t) => t.teamId === activeTeamId);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative px-3 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg border hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate">
            {activeTeam ? activeTeam.teamName : "Personal"}
          </span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border bg-popover shadow-md py-1">
          {/* Personal option */}
          <button
            onClick={() => { setActiveTeam(null); setIsOpen(false); }}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-secondary transition-colors",
              !activeTeamId && "bg-secondary/50"
            )}
          >
            <span>Personal</span>
            {!activeTeamId && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>

          {teams.length > 0 && <div className="border-t my-1" />}

          {/* Team options */}
          {teams.map((team) => (
            <button
              key={team.teamId}
              onClick={() => { setActiveTeam(team.teamId); setIsOpen(false); }}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-secondary transition-colors",
                activeTeamId === team.teamId && "bg-secondary/50"
              )}
            >
              <span className="truncate">{team.teamName}</span>
              {activeTeamId === team.teamId && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          ))}

          <div className="border-t my-1" />

          {/* Create team link */}
          <button
            onClick={() => { setIsOpen(false); navigate("/settings"); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create team
          </button>
        </div>
      )}
    </div>
  );
}
