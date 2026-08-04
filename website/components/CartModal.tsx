'use client';

import { useState, useCallback, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { X, ShoppingCart, CheckCircle, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface CartModalProps {
  open: boolean;
  tier: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const productData: Record<string, { name: string; price: string; amount: string; color: string }> = {
  standard: { name: 'Horizon Tweaks \u2014 Standard', price: '$14.99', amount: '14.99', color: 'text-stone-300' },
  pro: { name: 'Horizon Tweaks \u2014 Pro', price: '$29.99', amount: '29.99', color: 'text-stone-300' },
  ultimate: { name: 'Horizon Tweaks \u2014 Ultimate', price: '$59.99', amount: '59.99', color: 'text-stone-300' },
  'impulse-ping': { name: 'Horizon Ping', price: '$17.99', amount: '17.99', color: 'text-stone-300' },
  'impulse-keyboard': { name: 'Horizon Keyboard', price: '$12.99', amount: '12.99', color: 'text-stone-300' },
  'bundle-starter': { name: 'Starter Bundle', price: '$29.99', amount: '29.99', color: 'text-stone-300' },
  'bundle-gaming': { name: 'Gaming Bundle', price: '$44.99', amount: '44.99', color: 'text-stone-300' },
  'bundle-ultimate': { name: 'Ultimate Bundle', price: '$89.99', amount: '89.99', color: 'text-stone-300' },
};

type PaymentMethod = 'paypal';

/**
 * CartModal
 *
 * Handles one-time purchase flow for optimizer tiers, standalone apps,
 * and bundles via PayPal. Uses PayPal Orders (not Subscriptions).
 *
 * Flow:
 *   1. User approves PayPal checkout
 *   2. Server-side API captures the order and grants access
 *   3. On success, product is linked to the user's account
 */
export default function CartModal({ open, tier, onClose, onSuccess }: CartModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentMethod] = useState<PaymentMethod>('paypal');
  const [discountCode, setDiscountCode] = useState('');
  const [discountData, setDiscountData] = useState<{ percent: number; description: string } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [paypalSdkError, setPaypalSdkError] = useState(false);
  const [paypalConfigLoaded, setPaypalConfigLoaded] = useState(false);

  const [clientId, setClientId] = useState<string | null>(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setLoading(false);
      setError('');
      setSuccess('');
      setDiscountCode('');
      setDiscountData(null);
      setDiscountError('');
      setPaypalSdkError(false);
    }
  }, [open]);

  const handlePayPalOrder = useCallback(
    async (orderID: string) => {
      if (!auth.currentUser || !tier) {
        setError('You must be signed in to complete a purchase.');
        return;
      }

      const info = productData[tier];
      if (!info) return;

      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderID,
            uid: auth.currentUser.uid,
            productId: tier,
          }),
        });

        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || 'Payment capture failed');
        }

        if (discountData) {
          fetch('/api/discount/use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: discountCode,
              userId: auth.currentUser.uid,
              productId: tier,
            }),
          }).catch(err => console.error('[discount] Failed to record usage:', err));
        }

        setSuccess(`Purchase complete! ${info.name} is now linked to your account.`);
        setLoading(false);
        onSuccess();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        setError(msg);
        setLoading(false);
      }
    },
    [tier, onSuccess, discountData, discountCode]
  );

  // Fetch PayPal client ID from server-side API on mount
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch('/api/paypal/config');
        if (!res.ok) {
          setPaypalConfigLoaded(true);
          return;
        }
        const data = await res.json();
        if (data?.success && data.clientId) {
          setClientId(data.clientId);
        }
      } catch {
        // ignore
      } finally {
        setPaypalConfigLoaded(true);
      }
    })();
  }, [open]);

  if (!open || !tier) return null;

  const info = productData[tier];
  if (!info) return null;

  const paypalAvailable = paypalConfigLoaded && clientId && !paypalSdkError;

  const finalAmount = discountData
    ? (parseFloat(info.amount) * (1 - discountData.percent / 100)).toFixed(2)
    : info.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-sm p-6 md:p-7 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-surface-500 hover:text-white transition-colors">
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="size-5 text-accent" />
          <h3 className="text-xl font-bold text-white">Cart</h3>
        </div>
        <p className="text-xs text-surface-400 mb-5">One-time purchase &mdash; no recurring fees.</p>

        {/* Discount Code */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 block">
            Have a discount code?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountData(null); setDiscountError(''); }}
              placeholder="Enter code"
              className="flex-1 px-3 py-2.5 rounded-xl bg-surface-950/50 border border-surface-700/60 text-xs text-white placeholder-surface-500 outline-none focus:border-accent/40 transition-all"
              disabled={!!discountData}
            />
            {discountData ? (
              <button
                onClick={() => { setDiscountCode(''); setDiscountData(null); setDiscountError(''); }}
                className="px-3 py-2.5 rounded-xl text-xs font-medium border border-surface-700/60 text-surface-400 hover:text-surface-200 transition-all"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (!discountCode.trim()) return;
                  setDiscountLoading(true);
                  setDiscountError('');
                  try {
                    const res = await fetch('/api/discount/validate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: discountCode }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setDiscountData({ percent: data.discount_percent, description: data.description });
                    } else {
                      setDiscountError(data.error || 'Invalid discount code');
                    }
                  } catch {
                    setDiscountError('Failed to validate code. Try again.');
                  } finally {
                    setDiscountLoading(false);
                  }
                }}
                disabled={discountLoading || !discountCode.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {discountLoading ? '...' : 'Apply'}
              </button>
            )}
          </div>
          {discountError && (
            <p className="text-[10px] text-red-400 mt-1.5">{discountError}</p>
          )}
          {discountData && (
            <div className="flex items-center gap-1.5 mt-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
              <span className="text-[11px] font-semibold text-accent">{discountData.percent}% OFF</span>
              <span className="text-[10px] text-accent/60">&mdash; {discountData.description}</span>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="border border-surface-700/60 rounded-xl p-4 bg-surface-950/50 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-white">{info.name}</span>
              <span className="text-xs text-surface-500 ml-2">one-time</span>
            </div>
            {discountData ? (
              <div className="text-right">
                <span className="text-[10px] text-surface-500 line-through block">{info.price}</span>
                <span className={`text-sm font-bold ${info.color}`}>
                  ${finalAmount}
                </span>
              </div>
            ) : (
              <span className={`text-sm font-bold ${info.color}`}>{info.price}</span>
            )}
          </div>
          <div className="text-[11px] text-surface-500 pt-3 border-t border-surface-800/60 mt-3 space-y-1">
            <p>&bull; One-time payment &mdash; you&apos;re billed once</p>
            <p>&bull; Lifetime access &mdash; no recurring fees</p>
            <p>&bull; Purchase tied to your Horizon Tweaks account</p>
            {discountData && <p>&bull; {discountData.percent}% discount applied</p>}
          </div>
        </div>

        {/* Payment Method — PayPal only */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 block">
            Payment Method
          </label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border border-[#0070ba]/40 bg-[#0070ba]/10 text-[#0070ba]">
            <Shield className="size-3.5" />
            PayPal
          </div>
        </div>

        <div className="text-[10px] text-surface-500 mb-4 leading-relaxed px-1">
          Pay with your PayPal account. You&apos;ll complete payment inside PayPal&apos;s secure checkout &mdash; we never see your payment details.
        </div>

        {error && (
          <div className="flex items-center gap-2 border border-red-800/50 bg-red-900/15 px-3 py-2 rounded-lg mb-4 text-xs text-red-400">
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-2 border border-accent/30 bg-accent/10 px-4 py-4 rounded-xl mb-2 text-center">
            <CheckCircle className="size-8 text-accent" />
            <p className="text-sm font-semibold text-accent">Purchase Complete!</p>
            <p className="text-xs text-surface-400">{success}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {!paypalConfigLoaded ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="size-4 text-surface-400 animate-spin" />
                <span className="text-xs text-surface-400">Loading payment...</span>
              </div>
            ) : paypalAvailable ? (
              <div className="relative">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-900/80 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="size-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      <span className="text-xs text-surface-400 font-medium">Processing payment...</span>
                    </div>
                  </div>
                )}
                <PayPalScriptProvider
                  options={{
                    clientId: clientId!,
                    currency: 'USD',
                    intent: 'capture',
                  }}
                >
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      color: 'gold',
                      shape: 'rect',
                      label: 'paypal',
                      tagline: false,
                    }}
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        intent: 'CAPTURE' as const,
                        purchase_units: [{
                          amount: { currency_code: 'USD', value: finalAmount },
                          description: info.name,
                        }],
                      });
                    }}
                    onApprove={async (data) => {
                      if (!data.orderID) {
                        setError('No order ID returned from PayPal.');
                        return;
                      }
                      await handlePayPalOrder(data.orderID);
                    }}
                    onError={(err: any) => {
                      console.warn('PayPal SDK error:', err?.message || err);
                      setPaypalSdkError(true);
                      setError('PayPal encountered an error. Please try again or contact us on Discord.');
                    }}
                    onCancel={() => {
                      setError('Payment was cancelled.');
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-900/10 border border-stone-800/30">
                  <AlertTriangle className="size-4 text-stone-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-stone-200 font-medium">PayPal is temporarily unavailable</p>
                    <p className="text-[10px] text-stone-300/60 mt-1">
                      Payment processing is being configured. Please{' '}
                      <a href="https://discord.gg/ssQXKzA2HU" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-200">
                        contact us on Discord
                      </a>{' '}
                      to purchase a license key directly.
                    </p>
                  </div>
                </div>
                <a
                  href="https://discord.gg/ssQXKzA2HU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors"
                >
                  Purchase via Discord
                </a>
              </div>
            )}
            <button onClick={onClose} className="w-full py-2 rounded-xl text-xs text-surface-500 hover:text-surface-300 transition-colors font-medium">
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-4 text-[9px] text-surface-600">
          <Shield className="size-3" />
          <span>Secured by PayPal</span>
        </div>
      </div>
    </div>
  );
}
