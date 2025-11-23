import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "user" | "instructor" | "contentCreator" | "admin";

export type User = {
  id: string;
  email: string;
  role: Role;
  name?: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: Partial<User> & { email?: string }) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Role | Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("authUser");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("authUser", JSON.stringify(user));
      localStorage.setItem("isAuthenticated", "true");
    } else {
      localStorage.removeItem("authUser");
      localStorage.removeItem("isAuthenticated");
    }
  }, [user]);

  // If a stale numeric/fake id is loaded from localStorage, attempt to refresh
  // Do not depend on numeric demo ids. We will canonicalize users after login by querying the server.
  useEffect(() => {
    (async () => {
      try {
        if (user && user.id && !String(user.id).includes('-') && user.email) {
          // Canonicalize stored demo user by email (will replace numeric id with DB UUID)
          await login({ email: user.email });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const login = async (u: Partial<User> & { email?: string }) => {
    try {
      const email = u?.email || (u && (u as any).email);

      // If no email provided, fallback to using provided partial user (if any)
      if (!email) {
        if (u && u.id) {
          // Use provided user object directly
          const finalUser: User = {
            id: String(u.id),
            email: String(u.email || ''),
            role: (u.role as Role) || 'user',
            name: u.name,
          };
          setUser(finalUser);
          try { window.dispatchEvent(new CustomEvent('inbox:updated')); } catch {}
          return;
        }
        console.warn('Auth.login: no email or id provided; skipping canonicalization');
        return;
      }

      // Determine API base (uses `VITE_API_URL` in production if provided)
      const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

      // Try to fetch canonical user by email from the server so we get the DB UUID and role.
      // If the server is unreachable or returns non-OK, fall back to the provided user instead
      const url = `${API}/users/${encodeURIComponent(String(email))}`;
      let serverUser: any = null;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const body = await res.json().catch(() => null);
          serverUser = body?.user || body?.data || body || null;
        } else {
          console.warn('Auth.login: server lookup returned non-OK', { url, status: res.status });
        }
      } catch (e) {
        console.warn('Auth.login: server lookup failed', e);
      }

      // If server lookup succeeded and returned an id, prefer it. Otherwise fall back to provided values.
      const finalUser: User = {
        id: serverUser?.id ? String(serverUser.id) : String(u.id || serverUser?.id || ''),
        email: serverUser?.email || email || String(u.email || ''),
        role: (serverUser?.role as Role) || (u.role as Role) || 'user',
        name: serverUser?.name || u.name,
      };

      if (!finalUser.id) {
        // If we still don't have any id, do not erase existing auth; just set partial info
        console.warn('Auth.login: could not determine canonical id; using provided info');
      }

      setUser(finalUser);
      try { window.dispatchEvent(new CustomEvent('inbox:updated')); } catch {}
    } catch (err) {
      console.error('Error in Auth.login', err);
      // Do not clear auth on unexpected errors; if we have a provided user object, set it
      if (u && (u.id || u.email)) {
        const fallback: User = {
          id: String(u.id || ''),
          email: String(u.email || ''),
          role: (u.role as Role) || 'user',
          name: u.name,
        };
        setUser(fallback);
      }
    }
  };

  const logout = () => {
    setUser(null);
    // Clear all app data on logout
    localStorage.clear();
    window.location.href = "/";
  };

  const hasRole = (roles: Role | Role[]) => {
    if (!user) return false;
    const r = Array.isArray(roles) ? roles : [roles];
    return r.includes(user.role);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}