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

function getPlanIdForTier(tier: string): string {
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

    const {
      getUserSubscriptionId,
      getFirestoreSubscription,
      setCustomClaims,
      updateFirestoreTier,
      updateFirestoreSubscription,
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
      const priceId = newTier === 'standard'
        ? process.env.STRIPE_PRICE_ID_STANDARD
        : newTier === 'pro'
          ? process.env.STRIPE_PRICE_ID_PRO
          : process.env.STRIPE_PRICE_ID_ULTIMATE;

      if (!priceId) {
        throw new Error(`Stripe price ID for tier ${newTier} is not configured`);
      }

      await stripe.subscriptions.update(subscriptionId, {
        proration_behavior: 'create_prorations',
        items: [
          {
            id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
            price: priceId,
          },
        ],
      });

      await setCustomClaims(uid, { tier: newTier });
      await updateFirestoreTier(uid, newTier);
      await updateFirestoreSubscription(subscriptionId, {
        uid,
        tier: newTier,
        status: 'ACTIVE',
        provider,
      });

      return NextResponse.json({
        success: true,
        message: `Plan changed to ${newTier === 'standard' ? 'Standard' : newTier === 'pro' ? 'Pro' : 'Ultimate'}! Changes will apply on your next billing cycle.`,
      });
    }

    const newPlanId = getPlanIdForTier(newTier);
    const paypalToken = await getPayPalAccessToken();

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
      links?: Array<{ rel: string; href: string }>;
      message?: string;
      details?: Array<{ issue: string }>;
    };

    if (!reviseRes.ok) {
      const issue = reviseData.details?.[0]?.issue || reviseData.message || 'Unknown error';
      return NextResponse.json(
        { success: false, error: `PayPal revise failed: ${issue}` },
        { status: 400 }
      );
    }

    const approveLink = reviseData.links?.find((l) => l.rel === 'approve');
    const approvalUrl = approveLink?.href || null;

    await setCustomClaims(uid, { tier: newTier });
    await updateFirestoreTier(uid, newTier);
    await updateFirestoreSubscription(subscriptionId, {
      uid,
      tier: newTier,
      status: reviseData.status || 'ACTIVE',
      provider,
    });

    return NextResponse.json({
      success: true,
      approvalUrl,
      message: `Plan changed to ${newTier === 'standard' ? 'Standard' : newTier === 'pro' ? 'Pro' : 'Ultimate'}! ${
        approvalUrl ? 'PayPal approval is required and a new tab has been opened.' : 'Changes will apply next billing cycle.'
      }`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[subscription-change-plan] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
