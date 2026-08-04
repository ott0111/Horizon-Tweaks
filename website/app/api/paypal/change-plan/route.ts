/**
 * POST /api/paypal/change-plan
 *
 * Changes a user's subscription plan (upgrade or downgrade).
 * Uses PayPal's revise endpoint: POST /v1/billing/subscriptions/{id}/revise
 *
 * For PayPal-funded subscriptions, the user must approve the change via
 * a PayPal approval URL (returned in the response). The change takes effect
 * on the next billing cycle.
 *
 * Request body: { uid: string, newTier: string }
 *   - uid: Firebase user UID
 *   - newTier: "standard", "pro", or "ultimate"
 *
 * Response: { success: boolean, approvalUrl?: string, error?: string }
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

function getPlanIdForTier(tier: string): string {
  // Use NEXT_PUBLIC_ prefixed vars so the user only needs to set 2 env vars
  // in Vercel (these work server-side too in Next.js)
  const planIdStandard = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_STANDARD;
  const planIdPro = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_PRO;
  const planIdUltimate = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_ULTIMATE;

  if (tier === 'ultimate') {
    if (!planIdUltimate) throw new Error('NEXT_PUBLIC_PAYPAL_PLAN_ID_ULTIMATE not configured');
    return planIdUltimate;
  }
  if (tier === 'pro') {
    if (!planIdPro) throw new Error('NEXT_PUBLIC_PAYPAL_PLAN_ID_PRO not configured');
    return planIdPro;
  }
  if (!planIdStandard) throw new Error('NEXT_PUBLIC_PAYPAL_PLAN_ID_STANDARD not configured');
  return planIdStandard;
}

export async function POST(request: NextRequest) {
  try {
    const { uid, newTier } = (await request.json()) as {
      uid: string;
      newTier: string;
    };

    if (!uid || !newTier) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: uid, newTier' },
        { status: 400 }
      );
    }

    if (newTier !== 'standard' && newTier !== 'pro' && newTier !== 'ultimate') {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be "standard", "pro", or "ultimate"' },
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

    // 2. Get the new plan ID
    const newPlanId = getPlanIdForTier(newTier);

    // 3. Get PayPal access token
    const paypalToken = await getPayPalAccessToken();

    // 4. Revise the subscription to the new plan
    const reviseRes = await fetch(
      `${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/revise`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paypalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: newPlanId,
        }),
      }
    );

    const reviseData = (await reviseRes.json()) as {
      status?: string;
      id?: string;
      links?: Array<{ rel: string; href: string; method?: string }>;
      name?: string;
      message?: string;
      details?: Array<{ issue: string; description?: string }>;
    };

    if (!reviseRes.ok) {
      const issue = reviseData.details?.[0]?.issue || reviseData.message || 'Unknown error';
      return NextResponse.json(
        { success: false, error: `PayPal revise failed: ${issue}` },
        { status: 400 }
      );
    }

    // 5. Extract the approval URL if PayPal requires user re-consent
    const approveLink = reviseData.links?.find((l) => l.rel === 'approve');
    const approvalUrl = approveLink?.href || null;

    console.log(
      `[paypal-change-plan] Subscription ${subscriptionId} revised to plan ${newPlanId} for uid=${uid}` +
        (approvalUrl ? ' (user approval required)' : '')
    );

    // 6. Immediately update the tier in Firebase so the user gets/loses access now
    const { setCustomClaims, updateFirestoreTier, updateFirestoreSubscription } =
      await import('@/lib/firebase-admin');
    await setCustomClaims(uid, { tier: newTier });
    await updateFirestoreTier(uid, newTier);

    // 7. Update the subscription mapping in Firestore
    await updateFirestoreSubscription(subscriptionId, {
      uid,
      tier: newTier,
      status: reviseData.status || 'ACTIVE',
      provider: 'paypal',
    });

    console.log(`[paypal-change-plan] Updated Firebase tier=${newTier} for uid=${uid}`);

    return NextResponse.json({
      success: true,
      approvalUrl,
      subscriptionID: reviseData.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[paypal-change-plan] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
