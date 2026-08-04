/**
 * POST /api/paypal/webhook
 *
 * Receives PayPal webhook events for both one-time payments (legacy) and
 * subscription lifecycle events (recurring billing).
 *
 * Events handled:
 *   PAYMENT.CAPTURE.COMPLETED       — one-time capture success (legacy)
 *   CHECKOUT.ORDER.APPROVED         — one-time order approved (legacy)
 *   BILLING.SUBSCRIPTION.ACTIVATED  — subscription activated, grant tier
 *   BILLING.SUBSCRIPTION.CANCELLED  — subscription cancelled, downgrade to free
 *   PAYMENT.SALE.COMPLETED          — recurring monthly payment succeeded, renew tier
 *
 * Required env vars:
 *   PAYPAL_WEBHOOK_ID  (optional — if set, webhook signature is verified)
 */
import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API = process.env.PAYPAL_CLIENT_ID?.startsWith('A')
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

interface PayPalWebhookHeaders {
  'paypal-auth-algo': string | null;
  'paypal-cert-url': string | null;
  'paypal-transmission-id': string | null;
  'paypal-transmission-sig': string | null;
  'paypal-transmission-time': string | null;
}

interface PayPalWebhookEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    plan_id?: string;
    billing_agreement_id?: string;
    purchase_units?: Array<{
      custom_id?: string;
      amount?: { value?: string; currency_code?: string };
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          custom_id?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
      };
    }>;
  };
  resource_type?: string;
  summary?: string;
}

/**
 * Verify the webhook signature using PayPal's verification API.
 * If PAYPAL_WEBHOOK_ID is not configured, we skip verification (development mode).
 */
async function verifyWebhookSignature(
  headers: PayPalWebhookHeaders,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('[paypal-webhook] PAYPAL_WEBHOOK_ID not set — skipping signature verification');
    return true;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) return false;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokenRes.ok) return false;
  const tokenData = (await tokenRes.json()) as { access_token: string };

  const verificationRes = await fetch(
    `${PAYPAL_API}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    }
  );

  if (!verificationRes.ok) return false;
  const result = (await verificationRes.json()) as { verification_status?: string };
  return result.verification_status === 'SUCCESS';
}

/**
 * Grant a tier to a user (set claims + update Firestore).
 */
async function grantTierToUser(uid: string, tier: string) {
  const { setCustomClaims, updateFirestoreTier } = await import('@/lib/firebase-admin');
  await setCustomClaims(uid, { tier });
  await updateFirestoreTier(uid, tier);
  console.log(`[paypal-webhook] Granted tier=${tier} to uid=${uid}`);
}

/**
 * Handle BILLING.SUBSCRIPTION.ACTIVATED — grant the user their tier.
 * The subscription document was created in Firestore during activation.
 */
async function handleSubscriptionActivated(event: PayPalWebhookEvent): Promise<void> {
  const subscriptionId = event.resource?.id;
  if (!subscriptionId) {
    console.error('[paypal-webhook] No subscription ID in ACTIVATED event');
    return;
  }

  const { getFirestoreSubscription } = await import('@/lib/firebase-admin');
  const sub = await getFirestoreSubscription(subscriptionId);

  if (!sub) {
    console.error(`[paypal-webhook] No subscription mapping found for ${subscriptionId}`);
    return;
  }

  await grantTierToUser(sub.uid, sub.tier);

  // Update subscription status in Firestore
  const { updateSubscriptionStatus } = await import('@/lib/firebase-admin');
  await updateSubscriptionStatus(subscriptionId, 'ACTIVE');
}

/**
 * Handle PAYMENT.SALE.COMPLETED — recurring payment succeeded, renew the tier.
 * This fires every billing cycle.
 */
async function handleSaleCompleted(event: PayPalWebhookEvent): Promise<void> {
  // The subscription ID is in billing_agreement_id
  const subscriptionId = event.resource?.billing_agreement_id;
  if (!subscriptionId) {
    console.error('[paypal-webhook] No billing_agreement_id in SALE.COMPLETED event');
    return;
  }

  const { getFirestoreSubscription } = await import('@/lib/firebase-admin');
  const sub = await getFirestoreSubscription(subscriptionId);

  if (!sub) {
    console.error(`[paypal-webhook] No subscription mapping found for ${subscriptionId}`);
    return;
  }

  // Re-grant the tier to ensure it's still active (renewal)
  await grantTierToUser(sub.uid, sub.tier);
  console.log(`[paypal-webhook] Renewed tier=${sub.tier} for uid=${sub.uid}`);
}

/**
 * Handle BILLING.SUBSCRIPTION.UPDATED — plan was changed (upgrade/downgrade).
 * The tier is already updated in Firebase by the change-plan route immediately,
 * but this ensures sync after the user approves the change in PayPal.
 */
async function handleSubscriptionUpdated(event: PayPalWebhookEvent): Promise<void> {
  const subscriptionId = event.resource?.id;
  if (!subscriptionId) {
    console.error('[paypal-webhook] No subscription ID in UPDATED event');
    return;
  }

  const { getFirestoreSubscription } = await import('@/lib/firebase-admin');
  const sub = await getFirestoreSubscription(subscriptionId);

  if (!sub) {
    console.error(`[paypal-webhook] No subscription mapping found for ${subscriptionId}`);
    return;
  }

  // Re-grant the current tier from our mapping (already set by change-plan route)
  await grantTierToUser(sub.uid, sub.tier);
  console.log(`[paypal-webhook] Synced tier=${sub.tier} for uid=${sub.uid} after plan update`);
}

/**
 * Handle BILLING.SUBSCRIPTION.CANCELLED — downgrade the user to free
 * and free up their license key.
 */
async function handleSubscriptionCancelled(event: PayPalWebhookEvent): Promise<void> {
  const subscriptionId = event.resource?.id;
  if (!subscriptionId) {
    console.error('[paypal-webhook] No subscription ID in CANCELLED event');
    return;
  }

  const { getFirestoreSubscription, getLicenseKeyBySubscription, reactivateLicenseKey } = await import('@/lib/firebase-admin');
  const sub = await getFirestoreSubscription(subscriptionId);

  if (!sub) {
    console.error(`[paypal-webhook] No subscription mapping found for ${subscriptionId}`);
    return;
  }

  // Downgrade to free
  await grantTierToUser(sub.uid, 'free');

  // Update subscription status
  const { updateSubscriptionStatus } = await import('@/lib/firebase-admin');
  await updateSubscriptionStatus(subscriptionId, 'CANCELLED');

  // Free up the license key associated with this subscription
  try {
    const licenseKey = await getLicenseKeyBySubscription(subscriptionId);
    if (licenseKey) {
      await reactivateLicenseKey(licenseKey.key);
      console.log(`[paypal-webhook] Freed license key ${licenseKey.key} for subscription ${subscriptionId}`);
    }
  } catch (keyErr) {
    console.error('[paypal-webhook] Failed to free license key:', keyErr);
  }

  console.log(`[paypal-webhook] Downgraded uid=${sub.uid} to free (subscription cancelled)`);
}

// ===== Legacy one-time payment handlers (keep for backwards compatibility) =====

/**
 * Extract the custom_id (user's Firebase UID) from a one-time payment event.
 */
function extractCustomId(event: PayPalWebhookEvent): string | null {
  const pUnits = event.resource?.purchase_units;
  if (pUnits && pUnits.length > 0) {
    if (pUnits[0].custom_id) return pUnits[0].custom_id;
    const captures = pUnits[0].payments?.captures;
    if (captures && captures.length > 0 && captures[0].custom_id) {
      return captures[0].custom_id;
    }
  }
  if (event.resource?.custom_id) return event.resource?.custom_id;
  return null;
}

function extractAmount(event: PayPalWebhookEvent): number | null {
  const pUnits = event.resource?.purchase_units;
  if (pUnits && pUnits.length > 0 && pUnits[0].amount?.value) {
    return parseFloat(pUnits[0].amount.value);
  }
  const captures = pUnits?.[0]?.payments?.captures;
  if (captures && captures.length > 0 && captures[0].amount?.value) {
    return parseFloat(captures[0].amount.value);
  }
  if (event.resource?.amount?.value) {
    return parseFloat(event.resource.amount.value);
  }
  return null;
}

function amountToTier(amount: number): string | null {
  if (Math.abs(amount - 24.99) < 0.5) return 'ultimate';
  if (Math.abs(amount - 14.99) < 0.5) return 'pro';
  if (Math.abs(amount - 9.99) < 0.5) return 'standard';
  return null;
}

async function handleOneTimeCapture(event: PayPalWebhookEvent): Promise<void> {
  const uid = extractCustomId(event);
  if (!uid) {
    console.error('[paypal-webhook] No custom_id (uid) in one-time payment event');
    return;
  }

  const amount = extractAmount(event);
  if (!amount) {
    console.error('[paypal-webhook] No amount in one-time payment event');
    return;
  }

  const tier = amountToTier(amount);
  if (!tier) {
    console.error(`[paypal-webhook] Unknown amount: ${amount}`);
    return;
  }

  await grantTierToUser(uid, tier);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Extract raw body for signature verification
    const rawBody = await request.text();
    const headers: PayPalWebhookHeaders = {
      'paypal-auth-algo': request.headers.get('paypal-auth-algo'),
      'paypal-cert-url': request.headers.get('paypal-cert-url'),
      'paypal-transmission-id': request.headers.get('paypal-transmission-id'),
      'paypal-transmission-sig': request.headers.get('paypal-transmission-sig'),
      'paypal-transmission-time': request.headers.get('paypal-transmission-time'),
    };

    // 2. Parse the event
    const event: PayPalWebhookEvent = JSON.parse(rawBody);
    console.log(`[paypal-webhook] Received event: ${event.event_type} (id=${event.id})`);

    // 3. Verify webhook signature (optional in dev)
    const verified = await verifyWebhookSignature(headers, rawBody);
    if (!verified) {
      console.error('[paypal-webhook] Signature verification FAILED');
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 401 }
      );
    }

    // 4. Route the event to the appropriate handler
    const eventType = event.event_type || '';

    switch (eventType) {
      // === Subscription events ===
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        console.log('[paypal-webhook] Handling subscription activation');
        await handleSubscriptionActivated(event);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log('[paypal-webhook] Handling subscription cancellation');
        await handleSubscriptionCancelled(event);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        console.log('[paypal-webhook] Handling recurring sale completed');
        await handleSaleCompleted(event);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        console.log('[paypal-webhook] Handling subscription plan update');
        await handleSubscriptionUpdated(event);
        break;

      // === Legacy one-time payment events ===
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('[paypal-webhook] Handling one-time payment event');
        await handleOneTimeCapture(event);
        break;

      default:
        console.log(`[paypal-webhook] Ignoring unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[paypal-webhook] Error:', message);
    // PayPal requires 200 for all valid webhook requests (even on error)
    return NextResponse.json({ received: true, error: message });
  }
}

// PayPal sends GET requests for webhook URL verification on setup
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
