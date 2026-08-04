/**
 * POST /api/paypal/activate-subscription
 *
 * Called after a user approves a PayPal subscription on the client side.
 * Verifies the subscription with PayPal, grants the tier via Firebase,
 * and stores the subscription mapping for webhook lookups.
 *
 * Request body: { subscriptionID: string, uid: string, tier: string }
 *   - subscriptionID: PayPal subscription ID from client-side approval
 *   - uid: Firebase user UID
 *   - tier: "standard", "pro", or "ultimate"
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
    const { subscriptionID, uid, tier } = (await request.json()) as {
      subscriptionID: string;
      uid: string;
      tier: string;
    };

    if (!subscriptionID || !uid || !tier) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: subscriptionID, uid, tier' },
        { status: 400 }
      );
    }

    if (tier !== 'standard' && tier !== 'pro' && tier !== 'ultimate') {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be "standard", "pro", or "ultimate"' },
        { status: 400 }
      );
    }

    // 1. Get PayPal access token
    const paypalToken = await getPayPalAccessToken();

    // 2. Get subscription details from PayPal to verify it's active
    const subRes = await fetch(
      `${PAYPAL_API}/v1/billing/subscriptions/${subscriptionID}`,
      {
        headers: {
          Authorization: `Bearer ${paypalToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!subRes.ok) {
      const errText = await subRes.text();
      return NextResponse.json(
        { success: false, error: `PayPal subscription lookup failed: ${errText}` },
        { status: 400 }
      );
    }

    const subData = (await subRes.json()) as {
      status?: string;
      id?: string;
      plan_id?: string;
    };

    // Subscription must be ACTIVE or APPROVAL_PENDING (which becomes ACTIVE after first payment)
    if (subData.status !== 'ACTIVE' && subData.status !== 'APPROVAL_PENDING') {
      return NextResponse.json(
        { success: false, error: `Subscription status is ${subData.status}, expected ACTIVE` },
        { status: 400 }
      );
    }

    console.log(
      `[paypal-subscription] Subscription ${subscriptionID} verified (${tier}). Granting tier to uid=${uid}, status=${subData.status}`
    );

    // 3. Grant the tier via Firebase
    const {
      setCustomClaims,
      updateFirestoreTier,
      updateFirestoreSubscription,
      updateFirestoreUserSubscriptionId,
      getAvailableLicenseKey,
      assignLicenseKey,
    } = await import('@/lib/firebase-admin');
    await setCustomClaims(uid, { tier });
    await updateFirestoreTier(uid, tier);

    // 4. Store the subscription mapping for webhook lookups
    await updateFirestoreSubscription(subscriptionID, {
      uid,
      tier,
      status: subData.status,
      provider: 'paypal',
    });

    // 5. Store subscriptionId on the user document for easy lookups
    await updateFirestoreUserSubscriptionId(uid, subscriptionID);

    // 6. Assign a license key from the available pool and email it
    let licenseKey = '';
    try {
      const availableKey = await getAvailableLicenseKey('optimizer', tier);
      if (availableKey) {
        licenseKey = availableKey.key;

        // Resolve the user's email via Firebase token lookup
        let userEmail = '';
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
          // ignore — email will be empty, key will be available via website
        }

        if (userEmail) {
          await assignLicenseKey(availableKey.key, uid, userEmail, subscriptionID);

          // Send the license key email
          try {
            const { sendLicenseKeyEmail } = await import('@/lib/email');
            await sendLicenseKeyEmail({
              to: userEmail,
              userName: userEmail.split('@')[0] || 'there',
              licenseKey: availableKey.key,
              tier,
            });
          } catch (emailErr) {
            console.error('[paypal-subscription] Failed to send license key email:', emailErr);
          }
        } else {
          // Assign without email — key will be visible on the website
          await assignLicenseKey(availableKey.key, uid, uid, subscriptionID);
        }
      }
    } catch (keyErr) {
      console.error('[paypal-subscription] Failed to assign license key:', keyErr);
      // Non-blocking — tier is already granted
    }

    console.log(`[paypal-subscription] Granted ${tier} to uid=${uid}${licenseKey ? ', key=' + licenseKey : ''}`);

    return NextResponse.json({
      success: true,
      subscriptionID: subData.id,
      tier,
      licenseKey: licenseKey || undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[paypal-subscription] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
