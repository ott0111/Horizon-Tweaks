import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function createStripeClient() {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(stripeSecretKey, { apiVersion: '2026-06-24.dahlia' });
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const uid = metadata.uid;
  const tier = metadata.tier;

  if (!uid || !tier) {
    console.error('[stripe-webhook] Missing uid or tier metadata in checkout session');
    return;
  }

  const {
    setCustomClaims,
    updateFirestoreTier,
    updateFirestoreUserSubscriptionId,
    updateFirestoreSubscription,
    getAvailableLicenseKey,
    assignLicenseKey,
  } = await import('@/lib/firebase-admin');

  await setCustomClaims(uid, { tier });
  await updateFirestoreTier(uid, tier);
  await updateFirestoreUserSubscriptionId(uid, session.subscription as string | null);

  const subscriptionId = session.subscription as string | null;

  if (subscriptionId) {
    await updateFirestoreSubscription(subscriptionId, {
      uid,
      tier,
      status: 'ACTIVE',
      provider: 'stripe',
    });

    // Assign a license key from the available pool and email it
    try {
      const availableKey = await getAvailableLicenseKey('optimizer', tier);
      if (availableKey) {
        // Resolve the user's email via session customer details or token lookup
        let userEmail = session.customer_details?.email || '';

        if (!userEmail) {
          try {
            const { getAccessToken, getConfig } = await import('@/lib/firebase-admin');
            const token = await getAccessToken();
            const projectId = getConfig().projectId;
            const lookupRes = await fetch(
              `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ localId: [uid] }),
              }
            );
            if (lookupRes.ok) {
              const lookupData = (await lookupRes.json()) as { users?: Array<{ email: string }> };
              userEmail = lookupData.users?.[0]?.email || '';
            }
          } catch {
            // ignore
          }
        }

        if (userEmail) {
          await assignLicenseKey(availableKey.key, uid, userEmail, subscriptionId);

          try {
            const { sendLicenseKeyEmail } = await import('@/lib/email');
            await sendLicenseKeyEmail({
              to: userEmail,
              userName: userEmail.split('@')[0] || 'there',
              licenseKey: availableKey.key,
              tier,
            });
          } catch (emailErr) {
            console.error('[stripe-webhook] Failed to send license key email:', emailErr);
          }
        } else {
          await assignLicenseKey(availableKey.key, uid, uid, subscriptionId);
        }
      }
    } catch (keyErr) {
      console.error('[stripe-webhook] Failed to assign license key:', keyErr);
    }
  }

  console.log(`[stripe-webhook] Created subscription ${subscriptionId} for uid=${uid} tier=${tier}`);
}

async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as unknown as { subscription?: string | null }).subscription ?? null;

  if (!subscriptionId) {
    console.error('[stripe-webhook] Invoice paid event missing subscription id');
    return;
  }

  const { getFirestoreSubscription, setCustomClaims, updateFirestoreTier } = await import('@/lib/firebase-admin');
  const sub = await getFirestoreSubscription(subscriptionId);

  if (!sub) {
    console.error(`[stripe-webhook] No subscription mapping found for ${subscriptionId}`);
    return;
  }

  await setCustomClaims(sub.uid, { tier: sub.tier });
  await updateFirestoreTier(sub.uid, sub.tier);
  console.log(`[stripe-webhook] Invoice paid for subscription ${subscriptionId}, renewed tier=${sub.tier}`);
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const metadata = subscription.metadata ?? {};
  let uid = metadata.uid;
  let tier = metadata.tier;

  const { getFirestoreSubscription, setCustomClaims, updateFirestoreTier, updateFirestoreSubscription } =
    await import('@/lib/firebase-admin');
  const existing = await getFirestoreSubscription(subscriptionId);

  if (!uid || !tier) {
    if (!existing) {
      console.error(`[stripe-webhook] Missing uid or tier metadata and no firestore mapping for ${subscriptionId}`);
      return;
    }
    uid = existing.uid;
    tier = existing.tier;
  }

  const normalizedStatus = (subscription.status || 'active').toUpperCase();

  if (tier !== existing?.tier) {
    await setCustomClaims(uid, { tier });
    await updateFirestoreTier(uid, tier);
  }

  await updateFirestoreSubscription(subscriptionId, {
    uid,
    tier,
    status: normalizedStatus,
    provider: 'stripe',
  });

  console.log(`[stripe-webhook] Updated subscription ${subscriptionId} to tier=${tier}, status=${normalizedStatus}`);
}

async function handleCustomerSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const { getFirestoreSubscription, setCustomClaims, updateFirestoreTier, updateSubscriptionStatus, updateFirestoreUserSubscriptionId, updateFirestoreSubscription, getLicenseKeyBySubscription, reactivateLicenseKey } =
    await import('@/lib/firebase-admin');
  const sub = await getFirestoreSubscription(subscriptionId);

  if (!sub) {
    console.error(`[stripe-webhook] No subscription mapping found for ${subscriptionId}`);
    return;
  }

  await setCustomClaims(sub.uid, { tier: 'free' });
  await updateFirestoreTier(sub.uid, 'free');
  await updateFirestoreUserSubscriptionId(sub.uid, null);
  await updateSubscriptionStatus(subscriptionId, 'CANCELLED');
  await updateFirestoreSubscription(subscriptionId, {
    uid: sub.uid,
    tier: 'free',
    status: 'CANCELLED',
    provider: 'stripe',
  });

  // Free up the license key associated with this subscription
  try {
    const licenseKey = await getLicenseKeyBySubscription(subscriptionId);
    if (licenseKey) {
      await reactivateLicenseKey(licenseKey.key);
      console.log(`[stripe-webhook] Freed license key ${licenseKey.key} for subscription ${subscriptionId}`);
    }
  } catch (keyErr) {
    console.error('[stripe-webhook] Failed to free license key:', keyErr);
  }

  console.log(`[stripe-webhook] Cancelled subscription ${subscriptionId}, downgraded uid=${sub.uid}`);
}

export async function POST(request: NextRequest) {
  try {
    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured');
    }

    const stripe = createStripeClient();
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ success: false, error: 'Missing Stripe signature header' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Stripe webhook verification failed';
      console.error('[stripe-webhook] Verification failed:', message);
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    console.log(`[stripe-webhook] Received event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleSubscriptionCreated(event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleCustomerSubscriptionDeleted(event);
        break;
      default:
        console.log(`[stripe-webhook] Ignoring event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[stripe-webhook] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
