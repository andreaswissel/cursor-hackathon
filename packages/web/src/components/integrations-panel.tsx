import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Loader2,
  Check,
  X,
  RefreshCw,
  Trash2,
  Plus,
  Settings2,
  Terminal,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { PROVIDER_ICONS } from "./provider-icons";

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://api.product-os.ai/api");

type Provider = "airtable" | "jira" | "notion" | "google" | "slack" | "intercom" | "salesforce";

interface Integration {
  id: string;
  provider: Provider;
  metadata: {
    workspaceName?: string;
    email?: string;
    selectedSources?: string[];
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
  isEnabled: boolean;
  disabledReason: string | null;
}

interface LaunchModeState {
  publicDemoMode: boolean;
  integrationsLocked: boolean;
  enabledProviders: string[];
  waitlistUrl: string;
  message: string | null;
}

interface Source {
  id: string;
  name: string;
  type: string;
}

type ExecutionTarget = {
  id: "cursor" | "codex" | "claude-code";
  name: string;
  description: string;
  detail: string;
  commandTemplate?: string;
  deeplink?: string;
};

const EXECUTION_TARGETS: ExecutionTarget[] = [
  {
    id: "cursor",
    name: "Cursor",
    description: "Open prompt handoff via deep link",
    detail: "Use Ready to Build -> Open in coding agent -> Cursor",
    deeplink: "cursor://anysphere.cursor-deeplink/prompt?text=Paste%20Product%20OS%20concise%20prompt%20here",
  },
  {
    id: "codex",
    name: "Codex",
    description: "Run from terminal with prompt handoff",
    detail: "Use Ready to Build -> Open in coding agent -> Codex",
    commandTemplate: 'codex "<paste concise prompt from Product OS>"',
  },
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Run from terminal with prompt handoff",
    detail: "Use Ready to Build -> Open in coding agent -> Cloud Code",
    commandTemplate: 'claude "<paste concise prompt from Product OS>"',
  },
];

export function IntegrationsPanel() {
  const { token } = useAuth();
  const [connected, setConnected] = useState<Integration[]>([]);
  const [available, setAvailable] = useState<AvailableProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Source configuration modal state
  const [configuringIntegration, setConfiguringIntegration] = useState<Integration | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [loadingSources, setLoadingSources] = useState(false);
  const [savingSources, setSavingSources] = useState(false);
  const [launchMode, setLaunchMode] = useState<LaunchModeState | null>(null);
  const [copiedExecutionId, setCopiedExecutionId] = useState<string | null>(null);

  // Disconnect confirmation state
  const [disconnectConfirm, setDisconnectConfirm] = useState<Integration | null>(null);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch integrations");
      const data = await res.json();
      setConnected(data.connected);
      setAvailable(data.available);
      setLaunchMode(data.launchMode || null);
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
      if (errorMsg === "integrations_locked") {
        setError("Integrations are only available for full users.");
      } else {
        setError(decodeURIComponent(errorMsg));
      }
      window.history.replaceState({}, "", "/settings");
    }
  }, [token]);

  const handleConnect = async (provider: string) => {
    const providerState = available.find((item) => item.provider === provider);
    if (providerState && !providerState.isEnabled) {
      setError(providerState.disabledReason || "Integration is currently unavailable.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/integrations/connect/${provider}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to get auth URL");
      }
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

  const handleDisconnectClick = (integration: Integration) => {
    setDisconnectConfirm(integration);
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectConfirm) return;

    const integrationId = disconnectConfirm.id;
    setDisconnectConfirm(null);
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

  const handleConfigure = async (integration: Integration) => {
    setConfiguringIntegration(integration);
    setLoadingSources(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/integrations/${integration.id}/sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = await res.json();
      setSources(data.sources);
      setSelectedSources(new Set(data.selectedSources || []));
    } catch (err) {
      setError((err as Error).message);
      setConfiguringIntegration(null);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleSaveSources = async () => {
    if (!configuringIntegration) return;

    setSavingSources(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/integrations/${configuringIntegration.id}/sources`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedSources: Array.from(selectedSources) }),
      });
      if (!res.ok) throw new Error("Failed to save sources");
      setSuccess("Sources saved! Click Sync to fetch data.");
      setTimeout(() => setSuccess(null), 3000);
      setConfiguringIntegration(null);
      fetchIntegrations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingSources(false);
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  const handleCopyExecutionCommand = async (target: ExecutionTarget) => {
    if (!target.commandTemplate) return;
    try {
      await navigator.clipboard.writeText(target.commandTemplate);
      setCopiedExecutionId(target.id);
      setTimeout(() => setCopiedExecutionId(null), 2000);
    } catch {
      setError("Failed to copy command template");
    }
  };

  const handleOpenExecutionTarget = (target: ExecutionTarget) => {
    if (target.deeplink) {
      window.location.href = target.deeplink;
      return;
    }

    if (target.commandTemplate) {
      void handleCopyExecutionCommand(target);
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
      {launchMode?.integrationsLocked && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-600">
            Integrations are only available for full users
          </p>
          <p className="mt-1 text-sm text-amber-600/85">
            Try the demo modes now, then join the waitlist for full access.
          </p>
          <Link
            to={launchMode.waitlistUrl || "/waitlist"}
            className="mt-3 inline-flex text-sm font-medium text-amber-700 underline"
          >
            Join waitlist for full access
          </Link>
        </div>
      )}

      {/* Source Configuration Modal */}
      {configuringIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Configure {configuringIntegration.providerInfo.name}</h3>
                <p className="text-sm text-muted-foreground">Select which sources to sync</p>
              </div>
              <button
                onClick={() => setConfiguringIntegration(null)}
                className="p-2 hover:bg-secondary rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingSources ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sources found
                </p>
              ) : (
                <div className="space-y-2">
                  {sources.map((source) => {
                    const isSelected = selectedSources.has(source.id);
                    return (
                      <button
                        key={source.id}
                        onClick={() => toggleSource(source.id)}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-secondary/50"
                        )}
                      >
                        <div>
                          <p className="font-medium text-sm">{source.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{source.type}</p>
                        </div>
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {selectedSources.size} of {sources.length} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfiguringIntegration(null)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSources}
                  disabled={savingSources}
                  className="px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {savingSources && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Integrations */}
      {connected.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Connected</h3>
          {connected.map((integration) => {
            const Icon = PROVIDER_ICONS[integration.provider]!;
            const selectedCount = integration.metadata.selectedSources?.length || 0;
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
                        {selectedCount > 0 && ` · ${selectedCount} sources selected`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleConfigure(integration)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      title="Configure sources"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
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
                      onClick={() => handleDisconnectClick(integration)}
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
            const Icon = PROVIDER_ICONS[provider.provider as Provider]!;
            return (
              <button
                key={provider.provider}
                onClick={() => handleConnect(provider.provider)}
                disabled={!provider.isEnabled}
                className={cn(
                  "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                  provider.isEnabled
                    ? "hover:bg-secondary/50"
                    : "opacity-60 cursor-not-allowed"
                )}
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
                        {provider.isEnabled
                          ? provider.description
                          : provider.disabledReason || "Coming soon"}
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

      {/* Execution Targets */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Execution Targets</h3>
        {EXECUTION_TARGETS.map((target) => {
          const isCopied = copiedExecutionId === target.id;
          return (
            <div
              key={target.id}
              className="rounded-xl border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    {target.id === "cursor" ? (
                      <ExternalLink className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Terminal className="w-5 h-5 text-violet-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {target.name}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                        <Check className="w-3 h-3" />
                        Enabled
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{target.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{target.detail}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenExecutionTarget(target)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                >
                  {target.id === "cursor" ? (
                    <>
                      Open
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </>
                  ) : isCopied ? (
                    <>
                      Copied
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    </>
                  ) : (
                    <>
                      Copy Command
                      <Terminal className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!disconnectConfirm}
        onClose={() => setDisconnectConfirm(null)}
        onConfirm={handleDisconnectConfirm}
        title="Disconnect integration?"
        description={`This will disconnect ${disconnectConfirm?.providerInfo.name} and remove all synced data. You can reconnect anytime.`}
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
