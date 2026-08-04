'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import CartModal from '@/components/CartModal';

export default function SiteShell({ children }: { children: ReactNode }) {
  const {
    user,
    cartTier,
    authOpen,
    cartOpen,
    setAuthOpen,
    setCartOpen,
    setCartTier,
    handleLogout,
    handleCartSuccess,
  } = useAuth();

  return (
    <>
      <Header
        user={user}
        cartTier={cartTier}
        onShowLogin={() => setAuthOpen(true)}
        onLogout={handleLogout}
        onOpenCart={() => setCartOpen(true)}
        onClaimAdmin={() => {}}
      />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <CartModal
        open={cartOpen}
        tier={cartTier}
        onClose={() => {
          setCartOpen(false);
          setCartTier(null);
        }}
        onSuccess={handleCartSuccess}
      />
    </>
  );
}
