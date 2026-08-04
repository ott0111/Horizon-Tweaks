import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API = process.env.PAYPAL_CLIENT_ID?.startsWith('A')
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function createStripeClient() {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(stripeSecretKey, { apiVersion: '2026-06-24.dahlia' });
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal auth error: ${errText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function isStripeSubscriptionId(id: string): boolean {
  return id.startsWith('sub_');
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = (await request.json()) as { uid: string };

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: uid' },
        { status: 400 }
      );
    }

    const {
      getUserSubscriptionId,
      getFirestoreSubscription,
      setCustomClaims,
      updateFirestoreTier,
      updateFirestoreUserSubscriptionId,
      updateSubscriptionStatus,
      updateFirestoreSubscription,
      getLicenseKeyBySubscription,
      reactivateLicenseKey,
    } = await import('@/lib/firebase-admin');

    const subscriptionId = await getUserSubscriptionId(uid);
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found for this user' },
        { status: 400 }
      );
    }

    const mapping = await getFirestoreSubscription(subscriptionId);
    const provider = mapping?.provider || (isStripeSubscriptionId(subscriptionId) ? 'stripe' : 'paypal');

    if (provider === 'stripe') {
      const stripe = createStripeClient();
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      const paypalToken = await getPayPalAccessToken();
      const cancelRes = await fetch(
        `${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paypalToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Cancelled by user from account settings.',
          }),
        }
      );

      if (!cancelRes.ok && cancelRes.status !== 204) {
        const errText = await cancelRes.text();
        if (cancelRes.status !== 422) {
          return NextResponse.json(
            { success: false, error: `PayPal cancel failed: ${errText}` },
            { status: 400 }
          );
        }
      }
    }

    await setCustomClaims(uid, { tier: 'free' });
    await updateFirestoreTier(uid, 'free');
    await updateFirestoreUserSubscriptionId(uid, null);
    await updateSubscriptionStatus(subscriptionId, 'CANCELLED');
    await updateFirestoreSubscription(subscriptionId, {
      uid,
      tier: 'free',
      status: 'CANCELLED',
      provider,
    });

    // Free up the license key associated with this subscription
    try {
      const licenseKey = await getLicenseKeyBySubscription(subscriptionId);
      if (licenseKey) {
        await reactivateLicenseKey(licenseKey.key);
        console.log(`[subscription-cancel] Freed license key ${licenseKey.key} for subscription ${subscriptionId}`);
      }
    } catch (keyErr) {
      console.error('[subscription-cancel] Failed to free license key:', keyErr);
    }

    return NextResponse.json({
      success: true,
      message:
        provider === 'stripe'
          ? 'Subscription cancelled at period end. You have been downgraded to Free in the app.'
          : 'Subscription cancelled. You have been downgraded to Free in the app.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[subscription-cancel] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
