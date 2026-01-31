import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Trash2,
  Table,
  Ticket,
  FileText,
  File,
  MessageSquare,
  Plus,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

type Provider = "airtable" | "jira" | "notion" | "google" | "slack";

interface Integration {
  id: string;
  provider: Provider;
  metadata: {
    workspaceName?: string;
    email?: string;
  };
  isActive: number;
  lastSyncedAt: string | null;
  createdAt: string;
  providerInfo: {
    name: string;
    description: string;
    color: string;
  };
}

interface AvailableProvider {
  provider: string;
  name: string;
  description: string;
  color: string;
}

const PROVIDER_ICONS: Record<Provider, typeof Table> = {
  airtable: Table,
  jira: Ticket,
  notion: FileText,
  google: File,
  slack: MessageSquare,
};

export function IntegrationsPanel() {
  const { token } = useAuth();
  const [connected, setConnected] = useState<Integration[]>([]);
  const [available, setAvailable] = useState<AvailableProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch integrations");
      const data = await res.json();
      setConnected(data.connected);
      setAvailable(data.available);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();

    // Check URL for success/error messages
    const params = new URLSearchParams(window.location.search);
    const connectedProvider = params.get("connected");
    const errorMsg = params.get("error");

    if (connectedProvider) {
      setSuccess(`Successfully connected ${connectedProvider}!`);
      // Clean URL
      window.history.replaceState({}, "", "/settings");
      setTimeout(() => setSuccess(null), 3000);
    }
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      window.history.replaceState({}, "", "/settings");
    }
  }, [token]);

  const handleConnect = async (provider: string) => {
    try {
      const res = await fetch(`${API_BASE}/integrations/connect/${provider}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to get auth URL");
      const data = await res.json();
      window.location.href = data.authUrl;
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSync = async (integrationId: string) => {
    setSyncingId(integrationId);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/integrations/${integrationId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }
      const data = await res.json();
      setSuccess(`Synced ${data.itemCount} items!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchIntegrations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Disconnect this integration? Synced data will be removed.")) return;

    setDeletingId(integrationId);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/integrations/${integrationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      setSuccess("Integration disconnected");
      setTimeout(() => setSuccess(null), 3000);
      fetchIntegrations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Integrations */}
      {connected.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Connected</h3>
          {connected.map((integration) => {
            const Icon = PROVIDER_ICONS[integration.provider];
            return (
              <div
                key={integration.id}
                className="rounded-xl border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${integration.providerInfo.color}20` }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: integration.providerInfo.color }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        {integration.providerInfo.name}
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {integration.metadata.workspaceName || integration.metadata.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingId === integration.id}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      title="Sync data"
                    >
                      {syncingId === integration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={deletingId === integration.id}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Disconnect"
                    >
                      {deletingId === integration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {integration.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last synced: {new Date(integration.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Available Integrations */}
      {available.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Available</h3>
          {available.map((provider) => {
            const Icon = PROVIDER_ICONS[provider.provider as Provider];
            return (
              <button
                key={provider.provider}
                onClick={() => handleConnect(provider.provider)}
                className="w-full rounded-xl border bg-card p-4 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${provider.color}20` }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: provider.color }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
    </div>
  );
}
