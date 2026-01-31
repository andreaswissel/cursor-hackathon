import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { Key, Loader2, Check, Trash2, Eye, EyeOff } from "lucide-react";
import { getAllSessions, type SessionSummary } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface Settings {
  hasApiKey: boolean;
  apiKeyPreview: string | null;
}

export function SettingsPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getAllSessions(),
      fetch(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([{ sessions }, settingsData]) => {
        setSessions(sessions);
        setSettings(settingsData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/settings/api-key`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save API key");
      }

      setSettings(data);
      setApiKey("");
      setSuccess("API key saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApiKey = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/settings/api-key`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete API key");
      }

      setSettings(data);
      setSuccess("API key removed");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar sessions={sessions} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">
            Manage your account settings and API keys
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* API Key Section */}
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Anthropic API Key</h2>
                    <p className="text-sm text-muted-foreground">
                      Use your own API key for unlimited usage
                    </p>
                  </div>
                </div>

                {settings?.hasApiKey ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-mono">
                          {settings.apiKeyPreview}
                        </span>
                      </div>
                      <button
                        onClick={handleDeleteApiKey}
                        disabled={isSaving}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove API key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored securely and used for all your sessions.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveApiKey} className="space-y-4">
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-ant-api03-..."
                        className="w-full px-4 py-3 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Get your API key from{" "}
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-500 hover:underline"
                        >
                          console.anthropic.com
                        </a>
                      </p>
                      <button
                        type="submit"
                        disabled={isSaving || !apiKey.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Key"
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
                    {success}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  With your own API key, you get unlimited sessions and prompts.
                  <br />
                  Your key is stored encrypted and only used for your requests.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
