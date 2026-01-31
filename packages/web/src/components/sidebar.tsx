import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Zap,
  Plus,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Settings,
  FileText,
} from "lucide-react";

interface SidebarProps {
  sessions?: Array<{
    id: string;
    idea: string;
    status: string;
    createdAt: string;
  }>;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    label: "Pending",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    label: "Running",
  },
  waiting_input: {
    icon: Clock,
    color: "text-purple-500",
    bgColor: "bg-purple-500",
    label: "Waiting",
  },
  completed: {
    icon: CheckCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500",
    label: "Failed",
  },
};

export function Sidebar({ sessions = [] }: SidebarProps) {
  const location = useLocation();

  // Group sessions by status
  const groupedSessions = sessions.reduce(
    (acc, session) => {
      const status = session.status as keyof typeof STATUS_CONFIG;
      if (!acc[status]) acc[status] = [];
      acc[status].push(session);
      return acc;
    },
    {} as Record<string, typeof sessions>
  );

  const statusOrder = ["running", "pending", "waiting_input", "completed", "failed"];

  return (
    <aside className="w-64 h-screen border-r bg-card flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Zap className="w-4 h-4 text-background" />
          </div>
          <div>
            <span className="font-semibold text-sm">Product OS</span>
            <span className="text-[10px] text-muted-foreground block -mt-0.5">
              Agentic PM
            </span>
          </div>
        </Link>
      </div>

      {/* New Session Button */}
      <div className="p-3">
        <Link
          to="/"
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium border rounded-lg hover:bg-secondary transition-colors"
        >
          New Session
          <Plus className="w-4 h-4" />
        </Link>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Sessions
          </span>
        </div>

        {statusOrder.map((status) => {
          const sessionsInStatus = groupedSessions[status];
          if (!sessionsInStatus?.length) return null;

          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const Icon = config.icon;

          return (
            <div key={status} className="mb-2">
              <div className="flex items-center gap-2 px-4 py-1.5">
                <div className={cn("w-2 h-2 rounded-full", config.bgColor)} />
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground ml-auto bg-secondary px-1.5 py-0.5 rounded">
                  {sessionsInStatus.length}
                </span>
              </div>
              {sessionsInStatus.map((session) => (
                <Link
                  key={session.id}
                  to={`/session/${session.id}`}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors",
                    location.pathname === `/session/${session.id}` &&
                      "bg-secondary"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      config.color,
                      status === "running" && "animate-spin-slow"
                    )}
                  />
                  <span className="truncate text-muted-foreground">
                    {session.idea.slice(0, 30)}
                    {session.idea.length > 30 && "..."}
                  </span>
                </Link>
              ))}
            </div>
          );
        })}

        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sessions yet</p>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="border-t p-3">
        <button className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
