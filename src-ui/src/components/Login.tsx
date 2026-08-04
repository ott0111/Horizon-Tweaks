import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Sparkles } from 'lucide-react';

function PillTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
        active
          ? 'bg-steel-600/30 text-steel-100 shadow-neo-raised-sm border border-white/[0.06]'
          : 'text-steel-500 hover:text-steel-300'
      }`}
    >
      {label}
    </button>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const errMsg = mode === 'login'
      ? await login(email, password)
      : await register(email, password, displayName);
    if (errMsg) setError(errMsg);
    setBusy(false);
  };

  return (
    <div className="flex-1 bg-surface-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-steel-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-steel-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6 overflow-hidden">
            <img src="/app-icon.png" alt="Horizon Tweaks" className="size-28" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Horizon Tweaks</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to unlock personalized features</p>
        </div>

        {/* Glass card */}
        <div className="relative rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-2xl p-8 shadow-2xl shadow-black/40 overflow-hidden">
          {/* Branding bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-steel-400/40 to-transparent rounded-t-3xl" />
          {/* Pill tabs */}
          <div className="flex justify-center bg-white/[0.03] rounded-full p-1 mb-8 border border-white/[0.04]">
            <PillTab active={mode === 'login'} label="Sign In" onClick={() => { setMode('login'); setError(null); }} />
            <PillTab active={mode === 'register'} label="Register" onClick={() => { setMode('register'); setError(null); }} />
          </div>

          {error && (
            <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm ${
              error.includes('SUSPENDED')
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              <ShieldAlert className="size-4 shrink-0" />
              <span>
                {error.includes('SUSPENDED')
                  ? <>Your account has been <strong>suspended</strong>. Contact support if you believe this is a mistake.</>
                  : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className={`text-xs font-medium transition-colors duration-200 ${
                focused === 'email' ? 'text-steel-200' : 'text-steel-400'
              }`}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                required
                placeholder="you@example.com"
                className={`w-full rounded-xl bg-white/[0.04] border px-4 py-3 text-sm text-white placeholder-steel-600 outline-none transition-all duration-200 ${
                  focused === 'email' ? 'border-steel-400/50 ring-1 ring-steel-400/20' : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-xs font-medium transition-colors duration-200 ${
                focused === 'password' ? 'text-steel-200' : 'text-steel-400'
              }`}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className={`w-full rounded-xl bg-white/[0.04] border px-4 py-3 text-sm text-white placeholder-steel-600 outline-none transition-all duration-200 ${
                  focused === 'password' ? 'border-steel-400/50 ring-1 ring-steel-400/20' : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5 animate-[fadeIn_0.3s_ease-out]">
                <label className={`text-xs font-medium transition-colors duration-200 ${
                  focused === 'displayName' ? 'text-steel-200' : 'text-steel-400'
                }`}>
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onFocus={() => setFocused('displayName')}
                  onBlur={() => setFocused(null)}
                  required
                  placeholder="Your name"                    className={`w-full rounded-xl bg-white/[0.04] border px-4 py-3 text-sm text-white placeholder-steel-600 outline-none transition-all duration-200 ${
                      focused === 'displayName' ? 'border-steel-400/50 ring-1 ring-steel-400/20' : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-br from-steel-500 to-steel-600 text-white px-4 py-3 text-sm font-semibold hover:from-steel-400 hover:to-steel-500 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-steel-500/20 border border-white/[0.06]"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/30">
              <Sparkles className="size-3" />
              <span>
                Free tier includes basic features.&nbsp;
                <span className="text-steel-300">Standard</span>
                <span className="text-steel-600">, </span>
                <span className="text-steel-400">Pro</span>
                <span className="text-steel-600">, and </span>
                <span className="text-steel-200">Ultimate</span>
                <span className="text-steel-600"> unlock advanced tools.</span>
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
