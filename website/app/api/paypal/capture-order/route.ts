/**
 * POST /api/paypal/capture-order
 *
 * Captures a PayPal order after the user has approved it.
 * On success, grants the purchased product to the user via Firebase.
 *
 * Request body: { orderId: string, uid: string, productId: string }
 *   - orderId: PayPal order ID from the client-side approval
 *   - uid: Firebase user UID
 *   - productId: "standard" | "pro" | "ultimate" | "impulse-ping" | "impulse-keyboard" | "bundle-starter" | "bundle-gaming" | "bundle-ultimate"
 *
 * Response: { success: boolean, error?: string, products?: Array<{ app: string; tier?: string }> }
 */
import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API = process.env.PAYPAL_CLIENT_ID?.startsWith('A')
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const STANDALONE_APPS = ['impulse-ping', 'impulse-keyboard'] as const;
const OPTIMIZER_TIERS = ['standard', 'pro', 'ultimate'] as const;

const BUNDLES: Record<string, Array<{ app: string; tier?: string }>> = {
  'bundle-starter': [{ app: 'impulse-ping' }, { app: 'impulse-keyboard' }],
  'bundle-gaming': [{ app: 'impulse-ping' }, { app: 'impulse-keyboard' }],
  'bundle-ultimate': [{ app: 'optimizer', tier: 'standard' }, { app: 'impulse-ping' }, { app: 'impulse-keyboard' }],
};

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

async function grantOptimizerTier(uid: string, tier: string): Promise<void> {
  const { setCustomClaims, updateFirestoreTier } = await import('@/lib/firebase-admin');
  try {
    await setCustomClaims(uid, { tier });
  } catch {
    // Fallback to Firestore only
  }
  await updateFirestoreTier(uid, tier);
  console.log(`[paypal-capture] Granted optimizer tier ${tier} to uid=${uid}`);
}

async function grantStandaloneApp(uid: string, app: string): Promise<void> {
  const { updateFirestoreAppAccess, getAvailableLicenseKey, assignLicenseKey } = await import('@/lib/firebase-admin');
  await updateFirestoreAppAccess(uid, app);
  try {
    const availableKey = await getAvailableLicenseKey(app);
    if (availableKey) {
      await assignLicenseKey(availableKey.key, uid, '', 'paypal-' + uid + '-' + Date.now());
    }
  } catch (e) {
    console.error(`[paypal-capture] Failed to assign key for ${app}:`, e);
  }
  console.log(`[paypal-capture] Granted standalone app ${app} to uid=${uid}`);
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, uid, productId } = (await request.json()) as {
      orderId: string;
      uid: string;
      productId: string;
    };

    if (!orderId || !uid || !productId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: orderId, uid, productId' },
        { status: 400 }
      );
    }

    // 1. Get PayPal access token
    const paypalToken = await getPayPalAccessToken();

    // 2. Capture the order
    const captureRes = await fetch(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paypalToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const captureData = (await captureRes.json()) as {
      status?: string;
      id?: string;
      name?: string;
      message?: string;
      details?: Array<{ issue: string }>;
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{
            id: string;
            status: string;
            custom_id?: string;
          }>;
        };
      }>;
    };

    if (!captureRes.ok) {
      const issue = captureData.details?.[0]?.issue || captureData.message || 'Unknown error';
      return NextResponse.json(
        { success: false, error: `PayPal capture failed: ${issue}` },
        { status: 400 }
      );
    }

    if (captureData.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: `PayPal order status: ${captureData.status}` },
        { status: 400 }
      );
    }

    const grantedProducts: Array<{ app: string; tier?: string }> = [];

    if (OPTIMIZER_TIERS.includes(productId as any)) {
      await grantOptimizerTier(uid, productId);
      grantedProducts.push({ app: 'optimizer', tier: productId });
    } else if (STANDALONE_APPS.includes(productId as any)) {
      await grantStandaloneApp(uid, productId);
      grantedProducts.push({ app: productId });
    } else if (BUNDLES[productId]) {
      for (const item of BUNDLES[productId]) {
        if (item.app === 'optimizer' && item.tier) {
          await grantOptimizerTier(uid, item.tier);
          grantedProducts.push({ app: 'optimizer', tier: item.tier });
        } else {
          await grantStandaloneApp(uid, item.app);
          grantedProducts.push({ app: item.app });
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Invalid productId: ${productId}` },
        { status: 400 }
      );
    }

    // Build download URLs for standalone apps
    const repoMap: Record<string, string> = {
      'impulse-ping': 'Impulse-Ping',
      'impulse-keyboard': 'Impulse-Keyboard',
    };
    const downloadUrls: Record<string, string> = {};
    for (const product of grantedProducts) {
      if (repoMap[product.app]) {
        const origin = new URL(request.url).origin;
        downloadUrls[product.app] = `${origin}/api/download-latest?repo=${repoMap[product.app]}`;
      }
    }

    console.log(
      `[paypal-capture] Order ${orderId} captured for uid=${uid}. Products: ${JSON.stringify(grantedProducts)}`
    );

    return NextResponse.json({
      success: true,
      orderId: captureData.id,
      captureId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      products: grantedProducts,
      downloadUrls: Object.keys(downloadUrls).length > 0 ? downloadUrls : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[paypal-capture] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
