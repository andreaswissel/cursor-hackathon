import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Zap, ArrowRight, Loader2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await login(email);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-4">
            <Zap className="w-3.5 h-3.5" />
            ProductOS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Welcome to ProductOS
          </h1>
          <p className="text-muted-foreground">
            Enter your email to get started with the demo
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border bg-card p-1">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-3 text-base bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
              autoFocus
              required
            />
            <div className="flex items-center justify-between px-3 py-2 border-t">
              <span className="text-xs text-muted-foreground">
                Demo mode - no password required
              </span>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>This is a demo with limited usage:</p>
          <p className="mt-1">1 session max &middot; 5 prompts per session</p>
        </div>
      </div>
    </div>
  );
}
