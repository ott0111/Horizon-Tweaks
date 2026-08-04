import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UserSession {
  user_id: string;
  email: string;
  display_name: string;
  tier: string;
  id_token: string;
  refresh_token: string;
}

interface AuthResult {
  success: boolean;
  message: string;
  session?: UserSession;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, displayName: string) => Promise<string | null>;
  logout: () => Promise<void>;
  checkTier: (minTier: string) => boolean;
  isAdmin: boolean;
  tier: string;
  refreshTier: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<UserSession | null>('restore_session')
      .then(session => {
        if (session) setUser(session);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const result = await invoke<AuthResult>('login', { request: { email, password } });
      if (result.success && result.session) {
        setUser(result.session);
        return null;
      }
      return result.message || 'Login failed';
    } catch (e: any) {
      return typeof e === 'string' ? e : e?.message || 'Login failed';
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string): Promise<string | null> => {
    try {
      const result = await invoke<AuthResult>('register', { request: { email, password, display_name: displayName } });
      if (result.success && result.session) {
        setUser(result.session);
        return null;
      }
      return result.message || 'Registration failed';
    } catch (e: any) {
      return typeof e === 'string' ? e : e?.message || 'Registration failed';
    }
  }, []);

  const logout = useCallback(async () => {
    try { await invoke('logout'); } catch {}
    setUser(null);
  }, []);

  const checkTier = useCallback((minTier: string): boolean => {
    if (!user) return false;
    const tiers = ['free', 'basic', 'pro', 'ultimate', 'admin'];
    const userIdx = tiers.indexOf(user.tier);
    const minIdx = tiers.indexOf(minTier);
    if (user.tier === 'admin') return true;
    return userIdx >= minIdx;
  }, [user]);

  const ADMIN_EMAILS = ['aayan.b.asim@gmail.com'];
  const isAdmin = user?.tier === 'admin' || (user?.email ? ADMIN_EMAILS.includes(user.email) : false);
  const tier = isAdmin ? 'admin' : (user?.tier || 'free');

  const checkTierWithAdmin = useCallback((minTier: string): boolean => {
    if (isAdmin) return true;
    return checkTier(minTier);
  }, [isAdmin, checkTier]);

  const refreshTier = useCallback(async (): Promise<boolean> => {
    try {
      const result = await invoke<AuthResult>('refresh_tier');
      if (result.success && result.session) {
        setUser(result.session);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkTier: checkTierWithAdmin, isAdmin, tier, refreshTier }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
