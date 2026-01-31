import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { deleteSession } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Zap,
  Plus,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  LogOut,
  FileText,
  User,
  Menu,
  X,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  sessions?: Array<{
    id: string;
    idea: string;
    status: string;
    createdAt: string;
  }>;
  onSessionDeleted?: () => void;
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

export function Sidebar({ sessions = [], onSessionDeleted }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; idea: string } | null>(null);
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string, idea: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ id: sessionId, idea });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    const sessionId = deleteConfirm.id;
    setDeleteConfirm(null);
    setDeletingId(sessionId);

    try {
      await deleteSession(sessionId);
      onSessionDeleted?.();
      // If we're on the deleted session's page, navigate home
      if (location.pathname === `/session/${sessionId}`) {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      setErrorDialog("Failed to delete session. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

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
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Zap className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold text-sm">Product OS</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 h-screen border-r bg-card flex flex-col",
        "fixed md:relative z-40",
        "transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo - hidden on mobile since we have the header */}
        <div className="p-4 border-b hidden md:block">
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

        {/* Spacer for mobile header */}
        <div className="h-14 md:hidden" />

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
                <div key={session.id} className="group relative">
                  <Link
                    to={`/session/${session.id}`}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors pr-10",
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
                  <button
                    onClick={(e) => handleDeleteClick(e, session.id, session.idea)}
                    disabled={deletingId === session.id}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded",
                      "text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      deletingId === session.id && "opacity-100"
                    )}
                    title="Delete session"
                  >
                    {deletingId === session.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
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
      <div className="border-t p-3 space-y-1">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="truncate">{user.email}</span>
          </div>
        )}
        <Link
          to="/settings"
          onClick={() => setIsOpen(false)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors",
            location.pathname === "/settings" && "bg-secondary text-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete session?"
        description={`This will permanently delete "${deleteConfirm?.idea.slice(0, 40)}${(deleteConfirm?.idea.length ?? 0) > 40 ? "..." : ""}". This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />

      {/* Error Alert Dialog */}
      <ConfirmDialog
        isOpen={!!errorDialog}
        onClose={() => setErrorDialog(null)}
        title="Something went wrong"
        description={errorDialog || ""}
        variant="destructive"
        alertOnly
      />
    </>
  );
}
