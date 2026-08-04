'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  userTier: string;
  cartTier: string | null;
  authOpen: boolean;
  cartOpen: boolean;
  loading: boolean;
  setAuthOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
  setCartTier: (tier: string | null) => void;
  handleBuy: (tier: string) => void;
  handleLogout: () => Promise<void>;
  handleClaimAdmin: () => Promise<void>;
  handleCartSuccess: () => void;
  refreshTier: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userTier, setUserTier] = useState('free');
  const [cartTier, setCartTier] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = ['aayan.b.asim@gmail.com'];

  const refreshTier = useCallback(async () => {
    if (!auth.currentUser) {
      setUserTier('free');
      return;
    }
    // Always treat admin email as admin tier, even if custom claims haven't been set yet
    if (ADMIN_EMAILS.includes(auth.currentUser.email || '')) {
      setUserTier('admin');
      return;
    }
    try {
      const result = await getIdTokenResult(auth.currentUser, true);
      const claimTier = (result.claims.tier as string) || 'free';
      if (claimTier !== 'free') {
        setUserTier(claimTier);
        return;
      }
      // Fallback: if custom claims show 'free', check Firestore user doc
      // This handles the case where setCustomClaims failed during license redemption
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch('/api/user/tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tier && data.tier !== 'free') {
            setUserTier(data.tier);
            return;
          }
        }
      } catch {}
      setUserTier(claimTier);
    } catch {
      setUserTier('free');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
  }, []);

  const syncUserData = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
    } catch {
      // Silently fail — user doc sync is best-effort
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await refreshTier();
        // Sync user data to Firestore so admin can see email/name
        syncUserData();
        if (cartTier) setCartOpen(true);
      } else {
        setUserTier('free');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [cartTier, refreshTier, syncUserData]);

  const handleBuy = useCallback((tier: string) => {
    if (tier === 'free') return;
    if (!auth.currentUser) {
      setCartTier(tier);
      setAuthOpen(true);
      return;
    }
    setCartTier(tier);
    setCartOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setCartTier(null);
    setUserTier('free');
  }, []);

  const handleClaimAdmin = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const idToken = await getIdTokenResult(auth.currentUser);
      const res = await fetch('http://127.0.0.1:28473/set-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: idToken.token }),
      });
      const data = await res.json();
      if (data.success) {
        alert('You are now admin! Reopen Horizon Tweaks to access the Admin Panel.');
      } else {
        alert('Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Failed to fetch') || msg.includes('ERR_CONNECTION_REFUSED')) {
        alert('Horizon Tweaks desktop app is not running.\n\nOpen the app and sign in — admin is enabled automatically for your email.');
      } else {
        alert('Error: ' + msg);
      }
    }
  }, []);

  const handleCartSuccess = useCallback(() => {
    setCartTier(null);
    refreshTier();
  }, [refreshTier]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userTier,
        cartTier,
        authOpen,
        cartOpen,
        loading,
        setAuthOpen,
        setCartOpen,
        setCartTier,
        handleBuy,
        handleLogout,
        handleClaimAdmin,
        handleCartSuccess,
        refreshTier,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
