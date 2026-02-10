import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { getInviteByToken, acceptInvite, declineInvite } from "@/lib/api";
import { Zap, Loader2, Users, Check, X } from "lucide-react";

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, refreshUser, setActiveTeam } = useAuth();

  const [invite, setInvite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInviteByToken(token)
      .then(setInvite)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await acceptInvite(token);
      await refreshUser();
      if (result.teamId) {
        setActiveTeam(result.teamId);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setDeclining(true);
    try {
      await declineInvite(token);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setDeclining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Zap className="w-4 h-4 text-background" />
          </div>
          <span className="text-lg font-semibold">Product OS</span>
        </div>

        {isLoading ? (
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Invite Not Available</h2>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="text-sm text-primary hover:underline"
            >
              Go to Product OS
            </button>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>

            <h2 className="text-lg font-semibold mb-1">
              Join {invite?.team?.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              {invite?.invitedBy?.displayName || invite?.invitedBy?.email} invited you
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              You'll join as <span className="font-medium">{invite?.role}</span>
            </p>

            {!user ? (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Log in to accept this invitation
                </p>
                <button
                  onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`)}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
                >
                  Log in to accept
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleDecline}
                  disabled={declining || accepting}
                  className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {declining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Decline"}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={accepting || declining}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {accepting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Accept & Join</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
