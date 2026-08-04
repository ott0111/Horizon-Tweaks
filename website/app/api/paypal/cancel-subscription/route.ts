/**
 * POST /api/paypal/cancel-subscription
 *
 * Cancels a user's PayPal subscription and downgrades them to free tier.
 * The user keeps access until the end of the current billing period
 * (PayPal handles this — we downgrade immediately in Firebase).
 *
 * Request body: { uid: string }
 *   - uid: Firebase user UID
 *
 * Response: { success: boolean, error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API = process.env.PAYPAL_CLIENT_ID?.startsWith('A')
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

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

export async function POST(request: NextRequest) {
  try {
    const { uid } = (await request.json()) as { uid: string };

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: uid' },
        { status: 400 }
      );
    }

    // 1. Look up the user's active subscription from Firestore
    const { getUserSubscriptionId } = await import('@/lib/firebase-admin');
    const subscriptionId = await getUserSubscriptionId(uid);

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found for this user' },
        { status: 400 }
      );
    }

    // 2. Get PayPal access token
    const paypalToken = await getPayPalAccessToken();

    // 3. Cancel the subscription in PayPal
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
      // If already cancelled, that's fine — proceed with downgrade
      if (cancelRes.status !== 422) {
        return NextResponse.json(
          { success: false, error: `PayPal cancel failed: ${errText}` },
          { status: 400 }
        );
      }
    }

    console.log(`[paypal-cancel] Subscription ${subscriptionId} cancelled for uid=${uid}`);

    // 4. Downgrade the user to free in Firebase
    const { setCustomClaims, updateFirestoreTier, updateFirestoreUserSubscriptionId, updateSubscriptionStatus, updateFirestoreSubscription } =
      await import('@/lib/firebase-admin');
    await setCustomClaims(uid, { tier: 'free' });
    await updateFirestoreTier(uid, 'free');
    await updateFirestoreUserSubscriptionId(uid, null);
    await updateSubscriptionStatus(subscriptionId, 'CANCELLED');
    await updateFirestoreSubscription(subscriptionId, {
      uid,
      tier: 'free',
      status: 'CANCELLED',
      provider: 'paypal',
    });

    console.log(`[paypal-cancel] Downgraded uid=${uid} to free`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[paypal-cancel] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
