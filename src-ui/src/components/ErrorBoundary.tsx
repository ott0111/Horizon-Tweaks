import { Component, ErrorInfo, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  userId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, _info);
    invoke('log_frontend_error', {
      user_id: this.props.userId || '',
      source: 'error-boundary',
      message: error.message,
      stack: error.stack || '',
    }).catch((e) => console.error('[LogError] Failed to log error boundary:', e));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="max-w-md border border-white/[0.06] bg-white/[0.03] p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-xs text-white/50 mb-3">An unexpected error occurred. The error has been logged.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-1.5 pill-button px-4 py-2 text-xs font-semibold hover:bg-stone-300 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
