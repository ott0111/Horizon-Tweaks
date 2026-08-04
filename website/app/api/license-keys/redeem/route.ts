/**
 * POST /api/license-keys/redeem
 *
 * User-facing: redeem a license key to activate a tier or standalone app.
 *
 * Request body: { idToken: string, key: string }
 *   - idToken: Firebase ID token of the user
 *   - key: the license key to redeem
 *
 * Response: { success: boolean, app?: string, tier?: string, error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getLicenseKey,
  redeemLicenseKey,
  setCustomClaims,
  updateFirestoreTier,
  updateFirestoreAppAccess,
} from '@/lib/firebase-admin';

const FIREBASE_WEB_API_KEY = 'AIzaSyAX7AMem_7bEOg_oBUS-pYmIqJKv5WYJAY';

const STANDALONE_APPS = ['impulse-ping', 'impulse-keyboard'] as const;

async function getUserData(idToken: string): Promise<{ localId: string; email: string } | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) {
      console.error('[license-keys-redeem] Auth lookup failed:', res.status);
      return null;
    }
    const data = (await res.json()) as { users?: Array<{ localId: string; email: string }> };
    return data.users?.[0] || null;
  } catch (err) {
    console.error('[license-keys-redeem] Auth lookup error:', err);
    return null;
  }
}

function appDisplayName(app: string): string {
  const names: Record<string, string> = {
    optimizer: 'Horizon Tweaks',
    'impulse-ping': 'Horizon Ping',
    'impulse-keyboard': 'Horizon Keyboard',
  };
  return names[app] || app;
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, key } = (await request.json()) as {
      idToken: string;
      key: string;
    };

    if (!idToken || !key) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: idToken, key' },
        { status: 400 }
      );
    }

    const cleanKey = key.trim().toUpperCase();

    // Step 1: Get the key document
    let licenseKey;
    try {
      licenseKey = await getLicenseKey(cleanKey);
    } catch (e: any) {
      console.error('[license-keys-redeem] Failed to fetch license key:', e.message);
      return NextResponse.json(
        { success: false, error: `Server configuration error: ${e.message || 'unknown'}` },
        { status: 500 }
      );
    }

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid license key. The key could not be found.' },
        { status: 404 }
      );
    }

    // Step 2: Check key status
    if (licenseKey.status !== 'assigned' && licenseKey.status !== 'available') {
      return NextResponse.json(
        {
          success: false,
          error: `This license key has already been ${
            licenseKey.status === 'used' ? 'used' : 'revoked'
          }. Contact support if you believe this is a mistake.`,
        },
        { status: 400 }
      );
    }

    // Step 3: Get user info
    const user = await getUserData(idToken);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Could not verify your account. Please sign in again.' },
        { status: 401 }
      );
    }

    // Step 4: If key is assigned, check it belongs to this user
    if (licenseKey.assignedTo && licenseKey.assignedTo !== user.localId) {
      return NextResponse.json(
        { success: false, error: 'This license key is assigned to a different user.' },
        { status: 403 }
      );
    }

    const app = licenseKey.app || 'optimizer';
    const isStandalone = STANDALONE_APPS.includes(app as any);

    if (isStandalone) {
      // Standalone app key — grant app access
      try {
        await updateFirestoreAppAccess(user.localId, app);
      } catch (e: any) {
        console.error('[license-keys-redeem] Failed to set app access:', e.message);
        return NextResponse.json(
          { success: false, error: `Failed to activate ${appDisplayName(app)}. Your key is still valid — please try again.` },
          { status: 500 }
        );
      }

      try {
        await redeemLicenseKey(cleanKey, user.localId, user.email);
      } catch (e: any) {
        console.error('[license-keys-redeem] Failed to mark key as used:', e.message);
      }

      console.log(
        `[license-keys-redeem] Key ${cleanKey} redeemed by ${user.localId} (${user.email}) for app ${app}`
      );

      return NextResponse.json({
        success: true,
        app,
        message: `${appDisplayName(app)} is now unlocked! Open the app to start using it.`,
      });
    }

    // Step 5: Grant the tier via custom claims (optimizer key)
    try {
      await setCustomClaims(user.localId, { tier: licenseKey.tier });
    } catch (e: any) {
      console.error('[license-keys-redeem] Failed to set custom claims:', e.message);
      try {
        await updateFirestoreTier(user.localId, licenseKey.tier!, user.email);
        await redeemLicenseKey(cleanKey, user.localId, user.email);
        return NextResponse.json({
          success: true,
          app: 'optimizer',
          tier: licenseKey.tier,
          message: `Your ${licenseKey.tier === 'ultimate' ? 'Ultimate' : licenseKey.tier === 'pro' ? 'Pro' : 'Standard'} tier has been recorded. You may need to re-login for features to activate.`,
        });
      } catch (innerErr: any) {
        console.error('[license-keys-redeem] Firestore fallback also failed:', innerErr.message);
        return NextResponse.json(
          { success: false, error: `Failed to activate tier. Your key is still valid — please try again. Error: ${e.message || 'unknown'}` },
          { status: 500 }
        );
      }
    }

    try {
      await updateFirestoreTier(user.localId, licenseKey.tier!, user.email);
    } catch (e: any) {
      console.error('[license-keys-redeem] Failed to update Firestore tier:', e.message);
    }

    try {
      await redeemLicenseKey(cleanKey, user.localId, user.email);
    } catch (e: any) {
      console.error('[license-keys-redeem] Failed to mark key as used:', e.message);
    }

    console.log(
      `[license-keys-redeem] Key ${cleanKey} redeemed by ${user.localId} (${user.email}) for tier ${licenseKey.tier} (app: ${app})`
    );

    return NextResponse.json({
      success: true,
      app: 'optimizer',
      tier: licenseKey.tier,
      message: `Your ${licenseKey.tier === 'ultimate' ? 'Ultimate' : licenseKey.tier === 'pro' ? 'Pro' : 'Standard'} tier is now active! Open Horizon Tweaks to access your features.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[license-keys-redeem] Unhandled error:', message, err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
