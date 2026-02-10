import { useState, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Zap, ArrowRight, Loader2 } from "lucide-react";

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login, loginWithGoogle, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for OAuth error in URL
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(urlError);
      // Clean up URL
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

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
    if (needsPassword && !password) return;

    setIsLoading(true);
    setError(null);

    try {
      await login(email, needsPassword ? password : undefined);
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message === "Password required") {
        setNeedsPassword(true);
        setError(null);
      } else {
        setError(message);
      }
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

        {/* Google Sign In */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
        >
          <GoogleIcon className="w-5 h-5" />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">or continue with email</span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} autoComplete="on" action="/login" method="POST">
          <div className="rounded-xl border bg-card p-1">
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="username email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setNeedsPassword(false);
                setPassword("");
              }}
              placeholder="you@company.com"
              className="w-full px-4 py-3 text-base bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
              autoFocus
              required
              disabled={needsPassword}
            />
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={needsPassword ? "w-full px-4 py-3 text-base bg-transparent focus:outline-none placeholder:text-muted-foreground/50 border-t" : "sr-only"}
              tabIndex={needsPassword ? 0 : -1}
              required={needsPassword}
            />
            <div className="flex items-center justify-between px-3 py-2 border-t">
              <span className="text-xs text-muted-foreground">
                {needsPassword ? "Enter your password" : "Demo mode - no password required"}
              </span>
              <button
                type="submit"
                disabled={isLoading || !email.trim() || (needsPassword && !password)}
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
          <p className="mt-1">5 sessions max &middot; 5 prompts per session</p>
          <p className="mt-3">
            <a href="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
