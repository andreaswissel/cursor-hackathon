import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { Key, Loader2, Check, Trash2, Eye, EyeOff, Sparkles, Link2 } from "lucide-react";
import { getAllProjects } from "@/lib/api";
import type { ProjectWithSessions } from "@product-os/shared";
import { cn } from "@/lib/utils";
import { IntegrationsPanel } from "@/components/integrations-panel";

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://api.product-os.ai/api");

type Provider = "anthropic" | "openai" | "gemini";

interface ProviderConfig {
  hasKey: boolean;
  keyPreview: string | null;
}

interface Settings {
  providers: {
    anthropic: ProviderConfig;
    openai: ProviderConfig;
    gemini: ProviderConfig;
  };
  activeProvider: Provider;
}

const PROVIDER_INFO: Record<Provider, { name: string; color: string; placeholder: string; link: string }> = {
  anthropic: {
    name: "Anthropic",
    color: "bg-orange-500",
    placeholder: "sk-ant-api03-...",
    link: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    name: "OpenAI",
    color: "bg-emerald-500",
    placeholder: "sk-proj-...",
    link: "https://platform.openai.com/api-keys",
  },
  gemini: {
    name: "Google Gemini",
    color: "bg-blue-500",
    placeholder: "AIza...",
    link: "https://aistudio.google.com/apikey",
  },
};

export function SettingsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Track input state for each provider
  const [apiKeys, setApiKeys] = useState<Record<Provider, string>>({
    anthropic: "",
    openai: "",
    gemini: "",
  });
  const [showKeys, setShowKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    openai: false,
    gemini: false,
  });

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      getAllProjects(),
      fetch(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([{ projects: p }, settingsData]) => {
        setProjects(p);
        setSettings(settingsData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSaveKey = async (provider: Provider) => {
    const key = apiKeys[provider];
    if (!key.trim()) return;

    setSavingProvider(provider);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/settings/api-key/${provider}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey: key }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save API key");
      }

      // Refresh settings
      const settingsRes = await fetch(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(await settingsRes.json());
      setApiKeys((prev) => ({ ...prev, [provider]: "" }));
      setSuccess(`${PROVIDER_INFO[provider].name} API key saved!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingProvider(null);
    }
  };

  const handleDeleteKey = async (provider: Provider) => {
    setSavingProvider(provider);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/settings/api-key/${provider}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete API key");
      }

      // Refresh settings
      const settingsRes = await fetch(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(await settingsRes.json());
      setSuccess("API key removed");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSavingProvider(null);
    }
  };

  const handleSetActive = async (provider: Provider) => {
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/settings/active-provider`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to set active provider");
      }

      setSettings((prev) => (prev ? { ...prev, activeProvider: provider } : null));
      setSuccess(`${PROVIDER_INFO[provider].name} is now your active provider!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set active provider");
    }
  };

  const providers: Provider[] = ["anthropic", "openai", "gemini"];

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects} onProjectCreated={refreshProjects} onProjectDeleted={refreshProjects} onSessionDeleted={refreshProjects} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">
            Configure your AI providers for unlimited usage
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-semibold mb-2">Data & Privacy</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  This workspace is not configured for sensitive personal data by default.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a href="/privacy" className="underline hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                  <a href="/restricted-data" className="underline hover:text-foreground transition-colors">
                    Restricted Data Notice
                  </a>
                </div>
              </div>

              {/* Provider Cards */}
              {providers.map((provider) => {
                const info = PROVIDER_INFO[provider];
                const config = settings?.providers[provider];
                const isActive = settings?.activeProvider === provider;

                return (
                  <div
                    key={provider}
                    className={cn(
                      "rounded-xl border bg-card p-6 transition-all",
                      isActive && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            `${info.color}/10`
                          )}
                          style={{ backgroundColor: `color-mix(in srgb, ${info.color.replace('bg-', '')} 10%, transparent)` }}
                        >
                          <Key className={cn("w-5 h-5", info.color.replace("bg-", "text-"))} />
                        </div>
                        <div>
                          <h2 className="font-semibold flex items-center gap-2">
                            {info.name}
                            {isActive && (
                              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                                Active
                              </span>
                            )}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {config?.hasKey ? "Key configured" : "No key configured"}
                          </p>
                        </div>
                      </div>

                      {config?.hasKey && !isActive && (
                        <button
                          onClick={() => handleSetActive(provider)}
                          className="text-sm px-3 py-1.5 rounded-lg border hover:bg-secondary transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                    </div>

                    {config?.hasKey ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-mono">{config.keyPreview}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteKey(provider)}
                            disabled={savingProvider === provider}
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove API key"
                          >
                            {savingProvider === provider ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type={showKeys[provider] ? "text" : "password"}
                            value={apiKeys[provider]}
                            onChange={(e) =>
                              setApiKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                            }
                            placeholder={info.placeholder}
                            className="w-full px-4 py-3 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                          >
                            {showKeys[provider] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <a
                            href={info.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Get API key →
                          </a>
                          <button
                            onClick={() => handleSaveKey(provider)}
                            disabled={savingProvider === provider || !apiKeys[provider].trim()}
                            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {savingProvider === provider ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Key"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Status messages */}
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

              {/* Info box */}
              <div className="rounded-xl border border-dashed p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Unlimited usage with your own keys</p>
                    <p>
                      Add API keys from any supported provider to unlock unlimited sessions and prompts.
                      Your keys are stored securely and only used for your requests.
                    </p>
                  </div>
                </div>
              </div>

              {/* Integrations Section */}
              <div className="pt-8 border-t">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Integrations</h2>
                    <p className="text-sm text-muted-foreground">
                      Connect your tools to import OKRs, feedback, and docs
                    </p>
                  </div>
                </div>
                <IntegrationsPanel />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
