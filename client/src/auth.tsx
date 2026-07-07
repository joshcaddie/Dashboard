import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, setUnauthorizedHandler } from './api';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'member' | string;
  status: 'active' | 'invited' | string;
}

const ROLE_RANK: Record<string, number> = { member: 1, admin: 2, super_admin: 3 };
export function roleAtLeast(role: string | undefined, min: string): boolean {
  return (ROLE_RANK[role ?? ''] ?? 0) >= (ROLE_RANK[min] ?? 99);
}
export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  member: 'Team member',
};

interface AuthContextValue {
  ready: boolean;
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);
export const useAuth = () => {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Drop to the login gate if any request 401s mid-session.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let alive = true;
    api.get('/auth/me')
      .then((u) => { if (alive) setUser(u); })
      .catch(() => { if (alive) setUser(null); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.post('/auth/login', { email, password });
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ ready, user, setUser, login, logout }}>{children}</AuthCtx.Provider>;
}
