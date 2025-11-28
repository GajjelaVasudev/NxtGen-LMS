import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, onAuthChange } from '@/utils/supabaseBrowser';
import { toast } from 'sonner';

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
  login: (user: Partial<User> & { email?: string }, session?: any) => Promise<void>;
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
        // Do not perform automatic canonicalization while the user is actively
        // on authentication pages (login/signup). This avoids silently logging
        // a demo/admin account when someone merely visits the login page.
        const pathname = typeof window !== 'undefined' ? (window.location?.pathname || '') : '';
        if (!pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
          if (user && user.id && !String(user.id).includes('-') && user.email) {
            // Canonicalize stored demo user by email (will replace numeric id with DB UUID)
            await login({ email: user.email });
          }
        }
      } catch (e) {
        // ignore
      }
    })();

    // Subscribe to Supabase auth changes to keep session in sync across tabs
    const unsub = onAuthChange((event, session) => {
      // when auth state changes we don't modify the canonical user row here,
      // but consumers may rely on `supabase.auth.getSession()` via helpers.
      // If sign out occurred, clear stored user.
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  const login = async (u: Partial<User> & { email?: string }, session?: any) => {
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
        // map server canonical roles back to client-side role strings
        role: (function mapRole(srv: any) {
          const r = String(srv || '').toLowerCase();
          if (r === 'content_creator') return 'contentCreator' as Role;
          if (r === 'student') return 'user' as Role;
          if (r === 'instructor') return 'instructor' as Role;
          if (r === 'admin') return 'admin' as Role;
          return (u.role as Role) || 'user';
        })(serverUser?.role) as Role,
        name: (function deriveName(srv: any, providedName?: string) {
          if (!srv) return providedName;
          const f = srv?.first_name || null;
          const l = srv?.last_name || null;
          if (f || l) return `${(f || '').trim()} ${(l || '').trim()}`.trim();
          return srv?.name || providedName;
        })(serverUser, u.name),
      };

      if (!finalUser.id) {
        // If we still don't have any id, do not erase existing auth; just set partial info
        console.warn('Auth.login: could not determine canonical id; using provided info');
      }

      setUser(finalUser);

      // Ensure the Supabase browser client has a persisted session by signing in with password.
      // We intentionally avoid calling `setSession` from arbitrary server responses
      // and instead let Supabase issue tokens via `signInWithPassword` so `localStorage` is populated.
      try {
        if (supabase) {
          const maybePassword = (u as any).password;
          if (maybePassword && email) {
            try {
              const res = await supabase.auth.signInWithPassword({ email: String(email), password: String(maybePassword) });
              const err = (res as any).error;
              if (err) {
                console.warn('[Auth.login] signInWithPassword failed', err);
                toast.error('Login succeeded but failed to persist Supabase session');
              } else {
                // Verify session now exists
                try {
                  const current = await supabase.auth.getSession();
                  const hasToken = !!(current?.data?.session?.access_token);
                  if (hasToken) {
                    toast.success('Login successful');
                  } else {
                    console.warn('[Auth.login] supabase.auth.getSession returned no access token after signIn');
                    toast.error('Login succeeded but no Supabase token was found');
                  }
                } catch (e) {
                  console.warn('[Auth.login] error verifying Supabase session', e);
                  toast.error('Login succeeded but could not verify Supabase session');
                }
              }
            } catch (e) {
              console.warn('[Auth.login] signInWithPassword exception', e);
              toast.error('Login succeeded but sign-in to Supabase failed');
            }
          } else {
            // No password available: check if a session already exists
            try {
              const current = await supabase.auth.getSession();
              const hasToken = !!(current?.data?.session?.access_token);
              if (hasToken) {
                toast.success('Login successful');
              } else {
                console.warn('[Auth.login] no password provided and no Supabase session found');
                toast.error('Login successful but no Supabase session present (provide password to persist)');
              }
            } catch (e) {
              console.warn('[Auth.login] error checking Supabase session', e);
            }
          }
        }
      } catch (e) {
        console.warn('[Auth.login] unexpected error during Supabase session persistence', e);
      }

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