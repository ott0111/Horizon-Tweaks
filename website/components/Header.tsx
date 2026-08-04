'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Settings, ChevronDown, Menu, X, Download, KeyRound } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  user: any;
  cartTier: string | null;
  onShowLogin: () => void;
  onLogout: () => void;
  onOpenCart: () => void;
  onClaimAdmin: () => void;
}

const navLinks = [
  { href: '/platform', label: 'Platform' },
  { href: '/features', label: 'Features' },
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/affiliate', label: 'Affiliate Program' },
  { href: '/team', label: 'About' },
  { href: '/partners', label: 'Partners' },
  { href: '/faq', label: 'FAQ' },
];

export default function Header({ user, cartTier, onShowLogin, onLogout, onOpenCart, onClaimAdmin }: HeaderProps) {
  const pathname = usePathname();
  const isAdmin = user?.email === 'aayan.b.asim@gmail.com';
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      <header className="fixed top-3 left-3 right-3 md:top-4 md:left-4 md:right-4 z-50">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/9 bg-[#0a0a0a]/70 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
          <div className="px-5 md:px-6 h-14 md:h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img src="/app-icon.png" alt="Horizon Tweaks" className="size-7" />
              <span className="font-display font-bold text-[15px] text-white tracking-tight">
                Impulse<span className="text-stone-300 font-normal italic">Tweaks</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium text-zinc-200/70">
              {navLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3 py-2 rounded-lg transition-all duration-200 ${
                      active
                        ? 'text-white font-semibold'
                        : 'hover:text-white hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="relative z-10">{link.label}</span>
                    <span className={`absolute left-3 right-3 bottom-1.5 h-px bg-white/90 origin-left transition-transform duration-300 ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                    {active && (
                      <motion.div
                        className="absolute inset-0 bg-white/8 rounded-lg"
                        layoutId="nav-bg"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2.5 rounded-xl text-white/55 hover:text-white/70 hover:bg-white/8 transition-all"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>

              <button
                onClick={onOpenCart}
                className={`relative p-2.5 rounded-xl text-white/45 hover:text-white/60 hover:bg-white/8 transition-all ${user ? '' : 'hidden'}`}
              >
                <ShoppingCart className="size-[18px]" />
                {cartTier && (
                  <span className="absolute top-2 right-2 size-1.5 bg-stone-300 rounded-full animate-pulse-glow" />
                )}
              </button>

              <Link
                href="/download"
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium text-black bg-gradient-to-r from-stone-200 to-stone-300 hover:from-stone-300 hover:to-stone-400 transition-all duration-200 ml-1 shadow-lg shadow-black/30"
              >
                <Download className="size-3.5" />
                <b>Download</b>
              </Link>

              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 ml-1 pl-1.5 pr-2 py-1.5 rounded-xl hover:bg-white/8 transition-colors"
                  >
                    <div className="size-7 rounded-full bg-stone-300/10 border border-stone-300/20 flex items-center justify-center text-[10px] font-semibold text-stone-300">
                      {(user.displayName || user.email?.[0] || '?').charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className={`size-3.5 text-white/55 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/9 bg-[#111] py-1.5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)]"
                      >
                        <div className="px-3.5 py-2.5 border-b border-white/4 mb-1">
                          <p className="text-[12px] font-medium text-white truncate">{user.displayName || 'User'}</p>
                          <p className="text-[10px] text-white/55 truncate">{user.email}</p>
                        </div>
                        <Link
                          href="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-white/45 hover:text-white/75 hover:bg-white/5 transition-colors"
                        >
                          <Settings className="size-3.5" />
                          Account Settings
                        </Link>
                        <Link
                          href="/license"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-stone-300/70 hover:text-stone-300 hover:bg-stone-300/5 transition-colors"
                        >
                          <KeyRound className="size-3.5" />
                          License Key
                        </Link>
                        <button
                          onClick={() => { onLogout(); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-white/55 hover:text-white/65 hover:bg-white/5 transition-colors"
                        >
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={onShowLogin}
                  className="ml-1 px-4 py-2 rounded-full text-[13px] font-medium text-white/45 border border-white/9 hover:text-white/75 hover:border-stone-300/30 transition-all duration-300"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-x-3 top-3 z-70 rounded-2xl border border-white/9 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-[0_24px_80px_-16px_rgba(0,0,0,0.8)] md:hidden overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/4">
                <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                  <img src="/app-icon.png" alt="Horizon Tweaks" className="size-7" />
                  <span className="text-[15px] font-semibold text-white">Horizon Tweaks<span className="text-stone-300 font-normal italic">Tweaks</span></span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2.5 rounded-xl text-white/35 hover:text-white/65 transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="p-4 space-y-1">
                {[...navLinks, { href: '/download', label: 'Download' }].map((link, i) => {
                  const active = pathname === link.href || pathname.startsWith(link.href + '/');
                  const isDownload = link.href === '/download';
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * i, duration: 0.2 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
                          isDownload
                            ? 'text-stone-300 bg-stone-300/10 border border-stone-300/20'
                            : active
                              ? 'text-white bg-white/[0.05]'
                              : 'text-white/45 hover:text-white/65'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/4">
                {user ? (
                  <div className="space-y-1.5">
                    <Link
                      href="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl bg-white/5 px-4 py-3 text-[15px] text-white/45 hover:text-white/65"
                    >
                      Account Settings
                    </Link>
                    <Link
                      href="/license"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl bg-stone-300/5 px-4 py-3 text-[15px] text-stone-300/70 hover:text-stone-300"
                    >
                      License Key
                    </Link>
                    <button
                      onClick={() => { setMobileOpen(false); onLogout(); }}
                      className="w-full rounded-xl bg-white/5 px-4 py-3 text-left text-[15px] text-white/45 hover:text-white/65"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setMobileOpen(false); onShowLogin(); }}
                    className="w-full rounded-full bg-linear-to-r from-stone-200 to-stone-300 px-5 py-3 text-[15px] font-semibold text-black shadow-lg shadow-black/30"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}