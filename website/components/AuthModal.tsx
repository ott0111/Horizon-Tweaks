'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError('');
      setSuccess('');
      setEmail('');
      setPassword('');
      setDisplayName('');
      setIsLogin(true);
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess('Signed in successfully!');
        setTimeout(() => onClose(), 800);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cred.user) {
          await updateProfile(cred.user, {
            displayName: displayName || email.split('@')[0],
          });
        }
        setSuccess('Account created! You are now signed in.');
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-sm p-6 md:p-7 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-surface-500 hover:text-white transition-colors">
          <X className="size-4" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">{isLogin ? 'Welcome back' : 'Create account'}</h3>
        <p className="text-xs text-surface-400 mb-6">{isLogin ? 'Sign in to unlock your purchased tiers in Horizon Tweaks.' : 'Create your Horizon Tweaks account and choose a tier.'}</p>

        <div className="flex border-b border-surface-700/80 mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            className={`flex-1 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              isLogin ? 'text-accent border-b-2 border-accent' : 'text-surface-500 hover:text-surface-300 border-b-2 border-transparent'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            className={`flex-1 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              !isLogin ? 'text-accent border-b-2 border-accent' : 'text-surface-500 hover:text-surface-300 border-b-2 border-transparent'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 border border-red-800/50 bg-red-900/15 px-3 py-2 rounded-lg mb-4 text-xs text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 border border-accent/30 bg-accent/10 px-3 py-2 rounded-lg mb-4 text-xs text-accent">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-surface-700/80 bg-surface-950 px-3.5 py-2.5 text-sm text-surface-200 placeholder-surface-600 rounded-xl focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min. 6 characters"
              className="w-full border border-surface-700/80 bg-surface-950 px-3.5 py-2.5 text-sm text-surface-200 placeholder-surface-600 rounded-xl focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-surface-700/80 bg-surface-950 px-3.5 py-2.5 text-sm text-surface-200 placeholder-surface-600 rounded-xl focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-accent hover:bg-accent-dark text-black transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-surface-500 text-center mt-5">
          {isLogin ? (
            <>No account? <button onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }} className="text-accent hover:underline font-medium">Register</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }} className="text-accent hover:underline font-medium">Sign In</button></>
          )}
        </p>
      </div>
    </div>
  );
}
