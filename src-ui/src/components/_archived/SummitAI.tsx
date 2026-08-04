import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../contexts/AuthContext';
import { useTier } from '../hooks/useTier';
import { Sparkles, Send, Trash2, RefreshCw, Bot, History, Zap, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
  has_tweaks: boolean;
  tweaks: TweakAction[];
}

interface TweakAction {
  action_type: string;
  title: string;
  description: string;
  tweaks: string[];
}

interface AiResponse {
  reply: string;
  remaining_questions: number;
  has_tweaks: boolean;
  tweaks: TweakAction[];
  daily_limit: number;
}

function renderAI(text: string): string {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\$\$(.+?)\$\$/gs, '<pre class="text-[11px] bg-white/[0.03] rounded p-2 my-1 font-mono text-stone-300/70">$1</pre>')
    .replace(/^### (.+)$/gm, '<div class="text-sm font-bold text-white/70 mt-2 mb-1">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-base font-bold text-white/80 mt-3 mb-1">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-white/90 mt-3 mb-1">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/70">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="text-[10px] bg-white/[0.05] px-1 rounded text-stone-300/70">$1</code>')
    .replace(/\$(.+?)\$/g, '<span class="text-[11px] font-mono text-stone-300/70">$1</span>')
    .replace(/^- (.+)$/gm, '<div class="flex items-start gap-1.5 ml-2"><span class="text-white/20 mt-0.5">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br/>');
  return html;
}

const INITIAL_GREETING: ChatMessage = {
  role: 'ai',
  content: "Hello! I'm Horizon AI, your personal Windows optimization assistant. I can help you analyze your system, recommend tweaks, and optimize performance. What would you like help with?",
  timestamp: new Date().toISOString(),
  has_tweaks: false,
  tweaks: [],
};

export default function SummitAI() {
  const { user } = useAuth();
  const { tier } = useTier();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [applyingTweak, setApplyingTweak] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const history = await invoke<ChatMessage[]>('ai_get_history');
        if (history && history.length > 0) {
          setMessages([INITIAL_GREETING, ...history]);
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await invoke<{ remaining_questions: number; daily_limit: number }>('ai_get_question_limit', { tier });
        setRemaining(data.remaining_questions);
        setDailyLimit(data.daily_limit);
      } catch (e) {
        console.error('Failed to get question limit:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      has_tweaks: false,
      tweaks: [],
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await invoke<AiResponse>('ai_chat', { message: text, tier });

      const aiMessage: ChatMessage = {
        role: 'ai',
        content: response.reply,
        timestamp: new Date().toISOString(),
        has_tweaks: response.has_tweaks,
        tweaks: response.tweaks || [],
      };

      setMessages(prev => [...prev, aiMessage]);
      setRemaining(response.remaining_questions);
      setDailyLimit(response.daily_limit);
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : e?.message || 'An error occurred';
      const errorMessage: ChatMessage = {
        role: 'system',
        content: `Error: ${errMsg}`,
        timestamp: new Date().toISOString(),
        has_tweaks: false,
        tweaks: [],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    try {
      await invoke('ai_clear_history');
      setMessages([INITIAL_GREETING]);
      setNotification({ type: 'success', message: 'Chat history cleared' });
    } catch (e: any) {
      setNotification({ type: 'error', message: typeof e === 'string' ? e : 'Failed to clear history' });
    }
  };

  const applyTweak = async (tweak: TweakAction) => {
    setApplyingTweak(tweak.title);
    try {
      await invoke('ai_create_snapshot_and_apply', {
        title: tweak.title,
        description: tweak.description,
        tweaksJson: JSON.stringify(tweak.tweaks),
      });
      const successMsg: ChatMessage = {
        role: 'system',
        content: `✅ Snapshot '${tweak.title}' created and tweaks applied`,
        timestamp: new Date().toISOString(),
        has_tweaks: false,
        tweaks: [],
      };
      setMessages(prev => [...prev, successMsg]);
      setNotification({ type: 'success', message: `Snapshot '${tweak.title}' created and tweaks applied` });
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : e?.message || 'Failed to apply tweaks';
      setNotification({ type: 'error', message: errMsg });
    } finally {
      setApplyingTweak(null);
    }
  };

  return (
    <div className="flex h-full w-full">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl border ${notification.type === 'success' ? 'bg-steel-600/90 text-steel-100 border-steel-500/20' : 'bg-red-500/90 text-white border-red-400/20'}`}>
          {notification.type === 'success' ? <CheckCircle className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {notification.message}
        </div>
      )}

      <div className="w-full flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised-sm border border-white/[0.06]">
              <Sparkles className="size-4 text-steel-200" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                Horizon AI
                <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md ${
                  tier === 'admin' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                  tier === 'apex' ? 'bg-gold/10 border border-gold/20 text-gold' :
                  tier === 'prime' ? 'bg-steel-600/20 border border-steel-500/20 text-steel-400' :
                  'bg-white/[0.04] border border-white/[0.05] text-steel-500'
                }`}>{tier}</span>
              </h1>
              <p className="text-[10px] text-steel-600 font-medium flex items-center gap-1">
                {tier === 'admin' ? (
                  <><span className="text-stone-300/80 font-semibold">Unlimited</span> questions</>
                ) : (
                  <>{remaining}/{dailyLimit} questions remaining today</>
                )}
                <span className={`inline-block size-1.5 rounded-full ${tier === 'admin' || remaining > 0 ? 'bg-stone-300/60' : 'bg-rose-400/60'}`} />
              </p>
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-steel-600 hover:text-steel-400 hover:bg-white/[0.04] transition-colors border border-white/[0.06]"
          >
            <Trash2 className="size-3" />
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-steel-600 text-xs">
                <Loader className="size-3.5 animate-spin" />
                Loading history...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-steel-600 text-xs">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                {msg.role === 'system' ? (
                  <div className="text-[10px] text-steel-600 italic px-3 py-1.5 bg-white/[0.02] rounded-lg border border-white/[0.04] max-w-[80%] text-center">
                    {msg.content}
                  </div>
                ) : msg.role === 'user' ? (
                  <div className="max-w-[75%] px-3.5 py-2.5 rounded-2xl bg-steel-600 text-white text-xs leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[80%] glass-card p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="size-3 text-steel-500" />
                      <span className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold">Horizon AI</span>
                    </div>
                    <div className="text-xs text-white/50 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderAI(msg.content) }} />
                    {msg.has_tweaks && msg.tweaks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/[0.06]">
                        {msg.tweaks.map((tweak, ti) => (
                          <button
                            key={ti}
                            onClick={() => applyTweak(tweak)}
                            disabled={applyingTweak === tweak.title}
                            className="gold-button text-[10px] px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {applyingTweak === tweak.title ? (
                              <div className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Zap className="size-3" />
                            )}
                            Apply: {tweak.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="glass-card px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Bot className="size-3 text-steel-500" />
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-steel-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="size-1.5 rounded-full bg-steel-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="size-1.5 rounded-full bg-steel-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Horizon AI..."
              disabled={loading || (remaining <= 0 && tier !== 'admin')}
              className="flex-1 bg-transparent text-xs text-white placeholder-steel-600 focus:outline-none py-1.5 disabled:opacity-40"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading || (remaining <= 0 && tier !== 'admin')}
              className="flex items-center justify-center size-8 rounded-xl bg-steel-600 text-white hover:bg-steel-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </button>
          </div>
          {remaining <= 0 && tier !== 'admin' && (
            <p className="text-[10px] text-rose-400/70 text-center mt-1.5">Daily question limit reached. Come back tomorrow!</p>
          )}
        </div>
      </div>
    </div>
  );
}
