import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  getTeam,
  updateTeam,
  deleteTeam,
  updateMemberRole,
  removeMember,
  createInvite,
  revokeInvite,
  getAllProjects,
} from "@/lib/api";
import type { ProjectWithSessions, TeamRole } from "@product-os/shared";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Users,
  Shield,
  Crown,
  UserMinus,
  Copy,
  Check,
  Trash2,
  Mail,
  Link2,
  AlertTriangle,
} from "lucide-react";

export function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, refreshUser, setActiveTeam } = useAuth();

  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [inviting, setInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  const myRole = members.find((m) => m.userId === user?.id)?.role as TeamRole | undefined;
  const canManage = myRole === "owner" || myRole === "admin";

  const refreshProjects = () => {
    getAllProjects().then(({ projects }) => setProjects(projects)).catch(console.error);
  };

  useEffect(() => {
    if (!teamId) return;
    setIsLoading(true);
    Promise.all([getTeam(teamId), getAllProjects()])
      .then(([teamData, projectData]) => {
        setTeam(teamData.team);
        setMembers(teamData.members);
        setInvites(teamData.invites);
        setEditName(teamData.team.name);
        setProjects(projectData.projects);
      })
      .catch(() => setError("Failed to load team"))
      .finally(() => setIsLoading(false));
  }, [teamId]);

  const handleSaveName = async () => {
    if (!teamId || !editName.trim() || editName === team?.name) return;
    setSaving(true);
    try {
      const updated = await updateTeam(teamId, { name: editName.trim() });
      setTeam(updated);
      await refreshUser();
      showSuccess("Team name updated");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    if (!teamId) return;
    try {
      await updateMemberRole(teamId, userId, role);
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
      showSuccess("Role updated");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;
    try {
      await removeMember(teamId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      showSuccess("Member removed");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleInvite = async () => {
    if (!teamId) return;
    setInviting(true);
    try {
      const invite = await createInvite(teamId, inviteEmail || undefined, inviteRole);
      setInvites((prev) => [...prev, { ...invite, invitedEmail: inviteEmail || null, role: inviteRole, status: "pending" }]);
      setInviteEmail("");
      showSuccess("Invite sent");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!teamId) return;
    try {
      const invite = await createInvite(teamId, undefined, inviteRole);
      const url = `${window.location.origin}/invite/${invite.token}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      setInvites((prev) => [...prev, { ...invite, invitedEmail: null, role: inviteRole, status: "pending" }]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!teamId) return;
    try {
      await revokeInvite(teamId, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      showSuccess("Invite revoked");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    try {
      await deleteTeam(teamId);
      setActiveTeam(null);
      await refreshUser();
      navigate("/settings");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLeaveTeam = async () => {
    if (!teamId || !user) return;
    try {
      await removeMember(teamId, user.id);
      setActiveTeam(null);
      await refreshUser();
      navigate("/settings");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="w-3.5 h-3.5 text-amber-500" />;
    if (role === "admin") return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    return <Users className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar projects={projects} onProjectCreated={refreshProjects} onProjectDeleted={refreshProjects} onSessionDeleted={refreshProjects} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects} onProjectCreated={refreshProjects} onProjectDeleted={refreshProjects} onSessionDeleted={refreshProjects} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Team Settings</h1>
          <p className="text-muted-foreground mb-8">
            Manage {team?.name || "your team"}
          </p>

          <div className="space-y-6">
            {/* Team name */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-4">Team Info</h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canManage}
                  className="flex-1 px-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm disabled:opacity-50"
                  placeholder="Team name"
                />
                {canManage && (
                  <button
                    onClick={handleSaveName}
                    disabled={saving || !editName.trim() || editName === team?.name}
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </button>
                )}
              </div>
            </div>

            {/* Members */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-4">Members ({members.length})</h2>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        displayName={member.user?.displayName}
                        email={member.user?.email}
                        avatarUrl={member.user?.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.user?.displayName || member.user?.email}
                          {member.userId === user?.id && (
                            <span className="text-xs text-muted-foreground ml-1">(you)</span>
                          )}
                        </p>
                        {member.user?.displayName && (
                          <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canManage && member.userId !== user?.id ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                          className="text-xs rounded-lg border bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-1">
                          {roleIcon(member.role)}
                          {member.role}
                        </span>
                      )}
                      {canManage && member.userId !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite section */}
            {canManage && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-semibold mb-4">Invite Members</h2>

                {/* Pending invites */}
                {invites.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Pending Invites</p>
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{invite.invitedEmail || "Link invite"}</span>
                          <span className="text-xs text-muted-foreground">({invite.role})</span>
                        </div>
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Revoke invite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Invite form */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                      className="rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                    </button>
                  </div>
                  <button
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedLink ? (
                      <><Check className="w-4 h-4 text-emerald-500" /> Link copied!</>
                    ) : (
                      <><Link2 className="w-4 h-4" /> Copy invite link</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Danger zone */}
            <div className="rounded-xl border border-red-500/20 bg-card p-6">
              <h2 className="font-semibold text-red-500 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h2>
              <div className="space-y-3">
                {myRole !== "owner" && (
                  <button
                    onClick={() => setLeaveConfirm(true)}
                    className="px-4 py-2 text-sm rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Leave team
                  </button>
                )}
                {myRole === "owner" && (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-2 text-sm rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Delete team
                  </button>
                )}
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
                {success}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteTeam}
        title="Delete team?"
        description={`This will permanently delete "${team?.name}" and remove all members. Team projects will become personal projects. This cannot be undone.`}
        confirmLabel="Delete Team"
        cancelLabel="Cancel"
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={leaveConfirm}
        onClose={() => setLeaveConfirm(false)}
        onConfirm={handleLeaveTeam}
        title="Leave team?"
        description={`You will lose access to "${team?.name}" and all team projects. You can rejoin if someone invites you again.`}
        confirmLabel="Leave"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
