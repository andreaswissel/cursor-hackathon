import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserPreferences, TeamRole } from "@product-os/shared";

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://api.product-os.ai/api");

interface UserTeam {
  teamId: string;
  teamName: string;
  teamSlug: string;
  role: TeamRole;
}

interface User {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  onboardingCompleted?: boolean;
  preferences?: UserPreferences | null;
  teams?: UserTeam[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeTeamId: string | null;
  activeTeamRole: TeamRole | null;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => void;
  setTokenFromOAuth: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setActiveTeam: (teamId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [isLoading, setIsLoading] = useState(true);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => localStorage.getItem("active_team_id"));
  const [activeTeamRole, setActiveTeamRole] = useState<TeamRole | null>(null);

  // Derive team role whenever user or activeTeamId changes
  useEffect(() => {
    if (user?.teams && activeTeamId) {
      const team = user.teams.find((t) => t.teamId === activeTeamId);
      setActiveTeamRole(team?.role ?? null);
      if (!team) {
        // Not a member of this team anymore, clear it
        localStorage.removeItem("active_team_id");
        setActiveTeamIdState(null);
      }
    } else {
      setActiveTeamRole(null);
    }
  }, [user, activeTeamId]);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem("auth_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const { user } = await res.json();
          setUser(user);
          setToken(storedToken);
        } else {
          // Token invalid, clear it
          localStorage.removeItem("auth_token");
          setToken(null);
        }
      } catch {
        localStorage.removeItem("auth_token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = useCallback(async (email: string, password?: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let message = "Login failed";
      try {
        const error = await res.json();
        message = error.error || message;
      } catch {}
      throw new Error(message);
    }

    const { token: newToken, user: newUser } = await res.json();
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const loginWithGoogle = useCallback(() => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_BASE}/auth/google`;
  }, []);

  const setTokenFromOAuth = useCallback(async (newToken: string) => {
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);

    // Fetch user info
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });

      if (res.ok) {
        const { user } = await res.json();
        setUser(user);
      }
    } catch (err) {
      console.error("Failed to fetch user after OAuth:", err);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem("auth_token");
    if (!storedToken) return;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const { user } = await res.json();
        setUser(user);
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  }, []);

  const setActiveTeam = useCallback((teamId: string | null) => {
    if (teamId) {
      localStorage.setItem("active_team_id", teamId);
    } else {
      localStorage.removeItem("active_team_id");
    }
    setActiveTeamIdState(teamId);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("active_team_id");
    setToken(null);
    setUser(null);
    setActiveTeamIdState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, activeTeamId, activeTeamRole, login, loginWithGoogle, setTokenFromOAuth, logout, refreshUser, setActiveTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
