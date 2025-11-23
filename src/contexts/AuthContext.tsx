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
      // Require an email to canonicalize the user from the DB
      const email = u?.email;
      if (!email) {
        console.warn('Auth.login requires an email to canonicalize user');
        setUser(null);
        return;
      }

      // Always fetch canonical user by email from the server so we get the DB UUID and role
      const url = `/api/users/${encodeURIComponent(String(email))}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('Failed to fetch canonical user record', { url, status: res.status });
        setUser(null);
        return;
      }
      const body = await res.json();
      const serverUser = body?.user || body?.data || body;
      if (!serverUser || !serverUser.id) {
        console.warn('No user returned from server', serverUser);
        setUser(null);
        return;
      }

      const finalUser: User = {
        id: String(serverUser.id),
        email: serverUser.email || email,
        role: serverUser.role || 'user',
        name: serverUser.name || u.name,
      };

      setUser(finalUser);
      try { window.dispatchEvent(new CustomEvent('inbox:updated')); } catch {}
    } catch (err) {
      console.error('Error in Auth.login', err);
      setUser(null);
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