import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  roleOther: string | null;
  useCase: string;
  useCaseOther: string | null;
  status: "pending" | "invited" | "rejected";
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AdminPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate("/", { replace: true });
      return;
    }
    fetchEntries();
  }, [user, authLoading]);

  async function fetchEntries() {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/admin/waitlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch waitlist");
      const data = await res.json();
      setEntries(data.entries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: "invited" | "rejected") {
    try {
      setUpdatingId(id);
      const res = await fetch(`${API_URL}/api/admin/waitlist/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? data.entry : e))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchEntries(); }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Waitlist Management</h1>
          <span className="text-sm text-muted-foreground">
            {entries.length} entries
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Use Case</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No waitlist entries yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">{entry.name}</td>
                    <td className="p-3 text-muted-foreground">{entry.email}</td>
                    <td className="p-3">{entry.roleOther || entry.role}</td>
                    <td className="p-3 max-w-xs truncate">{entry.useCaseOther || entry.useCase}</td>
                    <td className="p-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {entry.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(entry.id, "invited")}
                            disabled={updatingId === entry.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50"
                          >
                            {updatingId === entry.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(entry.id, "rejected")}
                            disabled={updatingId === entry.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {updatingId === entry.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WaitlistEntry["status"] }) {
  const styles = {
    pending: "bg-yellow-500/10 text-yellow-600",
    invited: "bg-green-500/10 text-green-600",
    rejected: "bg-red-500/10 text-red-600",
  };

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}
