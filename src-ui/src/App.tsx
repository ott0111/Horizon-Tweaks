import { useState, useEffect, Suspense } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Ban } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateDialog from './components/UpdateDialog';
import Sidebar from './components/Sidebar';
import TitleBar from './components/TitleBar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import AnimatedLoader from './components/AnimatedLoader';
import PopOutOverlay from './components/PopOutOverlay';
import AdminPrompt from './components/AdminPrompt';
import WindowsFactsNotification from './components/WindowsFacts';
import { useDiscordRpc } from './hooks/useDiscordRpc';
import { FEATURE_REGISTRY } from './features/FeatureRegistry';
import type { FeatureDefinition } from './features/FeatureRegistry';

type View = 'dashboard' | 'admin-panel' | 'feedback' | 'settings' | string;

const VIEW_THEMES: Record<string, string> = {
  'general-tweaks': 'tweaks', 'advanced-tweaks': 'advanced', networking: 'network',
  'game-profiles': 'games', debloating: 'debloat', utilities: 'tools', bios: 'bios',
  rollback: 'tools', 'process-manager': 'default', 'startup-manager': 'default',
  'disk-analyzer': 'tools', 'latency-monitor': 'network', benchmark: 'default',
  'game-booster': 'games', 'wifi-analyzer': 'network', privacy: 'default', display: 'default',
  'network-speed': 'network', 'game-predict': 'games', 'driver-center': 'default',
};

function Loading({ view }: { view?: string }) {
  return <AnimatedLoader theme={(VIEW_THEMES[view || ''] || 'default') as any} />;
}

function AppInner() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [gpuVendor, setGpuVendor] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
  const [suspended, setSuspended] = useState(false);
  const [popoutMode, setPopoutMode] = useState(false);

  useDiscordRpc(view);

  useEffect(() => {
    const savedLocale = localStorage.getItem('app-locale');
    const savedDir = localStorage.getItem('app-locale-dir');
    if (savedLocale) document.documentElement.lang = savedLocale;
    if (savedDir) document.documentElement.dir = savedDir;
  }, []);

  useEffect(() => {
    if (user) {
      invoke<boolean>('check_user_suspended')
        .then(v => setSuspended(v === true))
        .catch(() => setSuspended(false));
    } else {
      setSuspended(false);
    }
  }, [user]);

  useEffect(() => {
    invoke<any>('check_for_update')
      .then(u => setPendingUpdate(u))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!dashboardData) {
      invoke('get_system_status_basic')
        .then((data) => setDashboardData(data))
        .catch(() => setDashboardData({
          cpu_name: 'System CPU', gpu_name: 'System GPU', total_memory_gb: 16,
          os_name: 'Windows', cpu_usage: 0, memory_usage: 0, gpu_usage: 0,
          disk_usage: 0, network_status: 'Connected', overall_health: 'Good'
        }));
    }
    if (!gpuVendor) {
      invoke<any[]>('get_all_gpus')
        .then((gpus) => { if (gpus.length > 0) setGpuVendor(gpus[0].vendor); })
        .catch(() => {});
    }
  }, []);

  const handleViewChange = (v: string) => {
    if (v === 'game-profiles') return;
    setView(v as View);
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col bg-surface-950">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <AnimatedLoader theme="default" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex flex-col bg-surface-950">
        <TitleBar />
        <Login />
      </div>
    );
  }

  if (suspended) {
    return (
      <div className="fixed inset-0 flex flex-col bg-surface-950">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full text-center p-8">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-steel-700 to-steel-800 flex items-center justify-center mx-auto mb-4 shadow-neo-raised border border-white/[0.06]">
              <Ban className="size-7 text-steel-400" />
            </div>
            <h1 className="text-xl font-bold text-steel-100 mb-2">Account Suspended</h1>
            <p className="text-sm text-steel-400 mb-6">
              Your account has been suspended by the administrator. You no longer have access to Horizon Tweaks.
            </p>
            <p className="text-xs text-steel-500">Contact support if you believe this is a mistake.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminPrompt />
      <WindowsFactsNotification />
      <ErrorBoundary userId={user.user_id}>
        <div className={`fixed inset-0 flex flex-col overflow-hidden bg-surface-950 ${popoutMode ? 'invisible' : ''}`}>
          <TitleBar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar active={view} onChange={handleViewChange} />
            <main className="flex-1 overflow-y-auto p-5">
              <div className={view === 'dashboard' ? '' : 'hidden'}>
                <Dashboard data={dashboardData} onPopOut={() => setPopoutMode(true)} />
              </div>
              {view !== 'dashboard' && (
                <Suspense fallback={<Loading view={view} />}>
                  {view === 'admin-panel' && (
                    <ErrorBoundary userId={user.user_id}>
                      {FEATURE_REGISTRY.find(f => f.id === 'admin-panel')?.component ? (
                        (() => { const Comp = FEATURE_REGISTRY.find(f => f.id === 'admin-panel')!.component; return <Comp />; })()
                      ) : null}
                    </ErrorBoundary>
                  )}
                  {view === 'feedback' && (
                    (() => { const Comp = FEATURE_REGISTRY.find(f => f.id === 'feedback')?.component; return Comp ? <Comp onClose={() => setView('dashboard')} /> : null; })()
                  )}
                  {view === 'settings' && (
                    (() => { const Comp = FEATURE_REGISTRY.find(f => f.id === 'settings')?.component; return Comp ? <Comp /> : null; })()
                  )}
                  {FEATURE_REGISTRY.filter(f => f.enabled && !['admin-panel','feedback','settings','dashboard'].includes(f.id)).map(f => (
                    view === f.id ? <f.component key={f.id} /> : null
                  ))}
                </Suspense>
              )}
            </main>
          </div>
        </div>
      </ErrorBoundary>
      {pendingUpdate && (
        <UpdateDialog update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />
      )}
      {popoutMode && (
        <PopOutOverlay onClose={() => setPopoutMode(false)} />
      )}
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const origOnError = window.onerror;
    const origOnRej = window.onunhandledrejection;

    window.onerror = (msg, url, line, col, err) => {
      const message = err?.message || String(msg);
      const stack = err?.stack || `${url}:${line}:${col}`;
      console.error(`[WindowError] ${message}`, stack);
      invoke('log_frontend_error', { user_id: '', source: 'window-onerror', message, stack })
        .catch(() => {});
      return false;
    };

    window.onunhandledrejection = (e) => {
      const message = e.reason?.message || String(e.reason);
      const stack = e.reason?.stack || '';
      console.error(`[UnhandledRejection] ${message}`, stack);
      invoke('log_frontend_error', { user_id: '', source: 'unhandled-rejection', message, stack })
        .catch(() => {});
    };

    setReady(true);
    return () => {
      window.onerror = origOnError;
      window.onunhandledrejection = origOnRej;
    };
  }, []);

  if (!ready) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  );
}
