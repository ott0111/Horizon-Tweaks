import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function createStripeClient() {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(stripeSecretKey, { apiVersion: '2026-06-24.dahlia' });
}

function getPriceId(tier: string): string | null {
  if (tier === 'standard') return process.env.STRIPE_PRICE_ID_STANDARD || null;
  if (tier === 'pro') return process.env.STRIPE_PRICE_ID_PRO || null;
  if (tier === 'ultimate') return process.env.STRIPE_PRICE_ID_ULTIMATE || null;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { uid, tier } = (await request.json()) as {
      uid: string;
      tier: string;
    };

    if (!uid || !tier) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: uid, tier' },
        { status: 400 }
      );
    }

    if (tier !== 'standard' && tier !== 'pro' && tier !== 'ultimate') {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be "standard", "pro", or "ultimate"' },
        { status: 400 }
      );
    }

    const stripe = createStripeClient();

    const priceId = getPriceId(tier);
    if (!priceId) {
      throw new Error(`Stripe price ID for tier ${tier} is not configured`);
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          uid,
          tier,
        },
      },
      client_reference_id: uid,
      success_url: `${origin}/?checkout_success=true`,
      cancel_url: `${origin}/?checkout_cancelled=true`,
    });

    if (!session.url) {
      throw new Error('Failed to create Stripe checkout session');
    }

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[stripe-create-session] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
