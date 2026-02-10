import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { deleteSession, deleteProject, updateProject, createProject } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TeamSwitcher } from "@/components/team-switcher";
import { UserAvatar } from "@/components/user-avatar";
import type { ProjectWithSessions } from "@product-os/shared";
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
  Compass,
  Lightbulb,
  Video,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { useState, useEffect } from "react";

interface SidebarProps {
  projects?: ProjectWithSessions[];
  onProjectCreated?: () => void;
  onProjectDeleted?: () => void;
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

export function Sidebar({ projects = [], onProjectCreated, onProjectDeleted, onSessionDeleted }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, activeTeamId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<{ id: string; idea: string } | null>(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<{ id: string; name: string } | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  // Auto-expand project containing the current session
  useEffect(() => {
    const match = location.pathname.match(/^\/session\/(.+)$/);
    if (match) {
      const currentSessionId = match[1];
      for (const project of projects) {
        if (project.sessions.some((s) => s.id === currentSessionId)) {
          setExpandedProjects((prev) => {
            const next = new Set(prev);
            next.add(project.id);
            return next;
          });
          break;
        }
      }
    }
  }, [location.pathname, projects]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleNewProject = async () => {
    setCreatingProject(true);
    try {
      await createProject("Untitled Project");
      onProjectCreated?.();
    } catch (error) {
      console.error("Failed to create project:", error);
      setErrorDialog("Failed to create project. Please try again.");
    } finally {
      setCreatingProject(false);
    }
  };

  const handleDeleteSessionClick = (e: React.MouseEvent, sessionId: string, idea: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteSessionConfirm({ id: sessionId, idea });
  };

  const handleDeleteSessionConfirm = async () => {
    if (!deleteSessionConfirm) return;

    const sessionId = deleteSessionConfirm.id;
    setDeleteSessionConfirm(null);
    setDeletingSessionId(sessionId);

    try {
      await deleteSession(sessionId);
      onSessionDeleted?.();
      if (location.pathname === `/session/${sessionId}`) {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      setErrorDialog("Failed to delete session. Please try again.");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleDeleteProjectClick = (e: React.MouseEvent, projectId: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteProjectConfirm({ id: projectId, name });
  };

  const handleDeleteProjectConfirm = async () => {
    if (!deleteProjectConfirm) return;

    const projectId = deleteProjectConfirm.id;
    setDeleteProjectConfirm(null);

    try {
      await deleteProject(projectId);
      onProjectDeleted?.();
    } catch (error) {
      console.error("Failed to delete project:", error);
      setErrorDialog((error as Error).message || "Failed to delete project. Please try again.");
    }
  };

  const handleRenameStart = (e: React.MouseEvent, projectId: string, currentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingProjectId(projectId);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = async (projectId: string) => {
    const name = renameValue.trim();
    setRenamingProjectId(null);
    if (!name) return;

    try {
      await updateProject(projectId, { name });
      onProjectCreated?.(); // reuse refresh callback
    } catch (error) {
      console.error("Failed to rename project:", error);
      setErrorDialog("Failed to rename project. Please try again.");
    }
  };

  const totalSessions = projects.reduce((sum, p) => sum + p.sessions.length, 0);

  function renderProject(project: ProjectWithSessions) {
    const isExpanded = expandedProjects.has(project.id);
    const isDefault = project.name === "Untitled Project";

    return (
      <div key={project.id} className="mb-1">
        {/* Project header */}
        <div className="group flex items-center gap-1 px-3 py-1.5 hover:bg-secondary/50 transition-colors rounded-md mx-1">
          <button
            onClick={() => toggleProject(project.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}

            {renamingProjectId === project.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(project.id);
                  if (e.key === "Escape") setRenamingProjectId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium bg-secondary border border-border rounded px-1 py-0 w-full min-w-0 focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            ) : (
              <span className="text-sm font-medium truncate">{project.name}</span>
            )}
          </button>

          <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded flex-shrink-0">
            {project.sessions.length}
          </span>

          {/* Project actions (hover) */}
          {renamingProjectId !== project.id && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={(e) => handleRenameStart(e, project.id, project.name)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
                title="Rename project"
              >
                <Pencil className="w-3 h-3" />
              </button>
              {!isDefault && (
                <button
                  onClick={(e) => handleDeleteProjectClick(e, project.id, project.name)}
                  className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  title="Delete project"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Nested sessions */}
        {isExpanded && (
          <div className="ml-3">
            {project.sessions.length === 0 ? (
              <div className="px-6 py-2 text-xs text-muted-foreground italic">
                No sessions yet
              </div>
            ) : (
              project.sessions.map((session) => {
                const config = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                const Icon = config.icon;
                const isActive = location.pathname === `/session/${session.id}`;

                return (
                  <div key={session.id} className="group/session relative">
                    <Link
                      to={`/session/${session.id}`}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-2 pl-6 pr-10 py-1.5 text-sm hover:bg-secondary transition-colors rounded-md mx-1",
                        isActive && "bg-secondary"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5 flex-shrink-0",
                          config.color,
                          session.status === "running" && "animate-spin-slow"
                        )}
                      />
                      <span className="truncate text-muted-foreground text-xs">
                        {session.idea.slice(0, 35)}
                        {session.idea.length > 35 && "..."}
                      </span>
                    </Link>
                    <button
                      onClick={(e) => handleDeleteSessionClick(e, session.id, session.idea)}
                      disabled={deletingSessionId === session.id}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded",
                        "text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
                        "opacity-0 group-hover/session:opacity-100 transition-opacity",
                        deletingSessionId === session.id && "opacity-100"
                      )}
                      title="Delete session"
                    >
                      {deletingSessionId === session.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

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
        "w-64 border-r bg-card flex flex-col",
        "h-[100dvh] md:h-screen",
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

      {/* Team Switcher */}
      <TeamSwitcher />

      {/* Nav Links */}
      <div className="px-3 pt-3 space-y-1 flex-shrink-0">
        <Link
          to="/imagine"
          onClick={() => setIsOpen(false)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 w-full text-sm font-medium rounded-lg transition-colors",
            location.pathname === "/imagine"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Lightbulb className="w-4 h-4" />
          Imagine
        </Link>
        <Link
          to="/document"
          onClick={() => setIsOpen(false)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 w-full text-sm font-medium rounded-lg transition-colors",
            location.pathname === "/document"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Video className="w-4 h-4" />
          Document
        </Link>
        <Link
          to="/discover"
          onClick={() => setIsOpen(false)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 w-full text-sm font-medium rounded-lg transition-colors",
            location.pathname === "/discover"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Compass className="w-4 h-4" />
          Discover
        </Link>
      </div>

      {/* New Project Button */}
      <div className="p-3 flex-shrink-0">
        <button
          onClick={handleNewProject}
          disabled={creatingProject}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {creatingProject ? "Creating..." : "New Project"}
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {/* Team projects section (when a team is active) */}
        {activeTeamId && (() => {
          const teamProjects = projects.filter((p: any) => p.teamId === activeTeamId);
          if (teamProjects.length === 0) return null;
          return (
            <>
              <div className="px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Team Projects
                </span>
              </div>
              {teamProjects.map((project) => renderProject(project))}
            </>
          );
        })()}

        <div className="px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {activeTeamId ? "Personal Projects" : "Projects"}
          </span>
        </div>

        {projects.filter((p: any) => !p.teamId).map((project) => renderProject(project))}

        {projects.length === 0 && totalSessions === 0 && (
          <div className="px-4 py-8 text-center">
            <Loader2 className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2 animate-spin" />
            <p className="text-xs text-muted-foreground">Loading projects...</p>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="border-t p-3 space-y-1 flex-shrink-0">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <UserAvatar
              displayName={user.displayName}
              email={user.email}
              avatarUrl={user.avatarUrl}
              size="sm"
            />
            <span className="truncate">{user.displayName || user.email}</span>
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
        <div className="px-3 pt-1 text-xs text-muted-foreground">
          <a href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy
          </a>
          {" · "}
          <a href="/restricted-data" className="underline hover:text-foreground transition-colors">
            Restricted Data
          </a>
        </div>
      </div>
    </aside>

      {/* Delete Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteSessionConfirm}
        onClose={() => setDeleteSessionConfirm(null)}
        onConfirm={handleDeleteSessionConfirm}
        title="Delete session?"
        description={`This will permanently delete "${deleteSessionConfirm?.idea.slice(0, 40)}${(deleteSessionConfirm?.idea.length ?? 0) > 40 ? "..." : ""}". This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />

      {/* Delete Project Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteProjectConfirm}
        onClose={() => setDeleteProjectConfirm(null)}
        onConfirm={handleDeleteProjectConfirm}
        title="Delete project?"
        description={`This will delete "${deleteProjectConfirm?.name}". All sessions will be moved to "Untitled Project". This action cannot be undone.`}
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
