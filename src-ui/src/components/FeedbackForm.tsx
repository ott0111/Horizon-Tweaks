import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Send, CheckCircle, Star, AlertTriangle, Heart, Sparkles, Lightbulb } from 'lucide-react';

export default function FeedbackForm({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSending(true);
    try {
      await invoke('submit_feedback', {
        user_id: user.user_id, subject, message,
        rating: rating > 0 ? rating : null,
      });
      setSent(true);
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Failed to submit feedback');
    } finally { setSending(false); }
  };

  if (sent) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="size-16 rounded-full bg-gradient-to-br from-stone-300/20 to-stone-400/10 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
          <Heart className="h-8 w-8 text-stone-300" />
        </div>
        <p className="text-lg font-bold text-white mb-2">Thank You! 🎉</p>
        <p className="text-sm text-white/50 mb-2">Your feedback means the world to us.</p>
        <p className="text-xs text-white/30 mb-6">Every suggestion helps make Horizon Tweaks better for everyone.</p>
        {onClose && (
          <button onClick={onClose} className="blue-button px-6">
            <Sparkles className="h-4 w-4" /> Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-stone-300/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-stone-300/20 to-stone-400/10 border border-white/[0.06] flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-stone-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Share Your Thoughts</h3>
            <p className="text-[10px] text-white/40">Help shape the future of Horizon Tweaks</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">What's on your mind?</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required
              placeholder="Feature idea, bug report, suggestion..."
              className="glass-input w-full text-sm py-2.5" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Rate your experience</label>
            <div className="flex items-center gap-1.5 h-full pt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n === rating ? 0 : n)}
                  className={`p-1.5 rounded-lg transition-all ${n <= rating ? 'text-stone-300 bg-stone-300/10 scale-110' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.03]'}`}>
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
              {rating > 0 && <span className="text-[10px] text-stone-300 ml-1 font-medium">{rating === 5 ? 'Love it!' : rating === 4 ? 'Great' : rating === 3 ? 'Okay' : rating === 2 ? 'Meh' : 'Bad'}</span>}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Tell us more</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required
            rows={4} placeholder="Describe your suggestion, issue, or idea in detail... We read every single one!"
            className="glass-input w-full resize-none text-sm" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-white/30 flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-400/50" /> We personally review all feedback
          </p>
          <div className="flex items-center gap-2">
            {onClose && (
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-white/50 hover:text-white/70 transition-colors">
                Cancel
              </button>
            )}
            <button type="submit" disabled={sending}
              className="blue-button px-6 py-2 text-xs disabled:opacity-50">
              {sending ? (
                <><div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Send Feedback</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
