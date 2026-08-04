/**
 * POST /api/user/sync
 *
 * Creates or updates the user's Firestore document with email and displayName.
 * Called after login/registration on the website to ensure the user doc exists.
 *
 * Uses the Firebase Auth REST API with the web API key for user lookup
 * (no service account needed for idToken verification).
 *
 * Request body: { idToken: string }
 *
 * Response: { success: boolean, error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';

// Firebase web API key (same as in lib/firebase.ts)
const FIREBASE_WEB_API_KEY = 'AIzaSyAX7AMem_7bEOg_oBUS-pYmIqJKv5WYJAY';

async function getUserData(idToken: string): Promise<{ localId: string; email: string; displayName?: string } | null> {
  try {
    // Use the Firebase Auth REST API directly with the web API key
    // This doesn't require a service account and is more reliable
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[user-sync] Auth lookup failed:', res.status, errText);
      return null;
    }
    const data = (await res.json()) as {
      users?: Array<{ localId: string; email: string; displayName?: string }>;
    };
    return data.users?.[0] || null;
  } catch (err) {
    console.error('[user-sync] Auth lookup error:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Missing idToken' },
        { status: 400 }
      );
    }

    const user = await getUserData(idToken);
    if (!user) {
      console.error('[user-sync] Failed to verify user with idToken');
      return NextResponse.json(
        { success: false, error: 'Could not verify your account. Please sign in again.' },
        { status: 401 }
      );
    }

    // Now use the Firestore REST API with service account to update the user doc
    const { getAccessToken, getConfig } = await import('@/lib/firebase-admin');
    let token: string;
    try {
      token = await getAccessToken();
    } catch (err) {
      console.error('[user-sync] Failed to get Firebase access token:', err);
      // If we can't get the access token, skip Firestore update but still return success
      // The user's data is in Firebase Auth, and the desktop app will sync on login
      return NextResponse.json({
        success: true,
        message: 'User verified but Firestore sync skipped (auth token unavailable)',
      });
    }

    const projectId = getConfig().projectId;
    const now = new Date().toISOString();
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.localId}`;

    // Check if doc exists
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const docExists = getRes.ok && getRes.status !== 404;

    if (docExists) {
      // Doc exists — update email and displayName
      const url = `${getUrl}?updateMask.fieldPaths=email&updateMask.fieldPaths=displayName&updateMask.fieldPaths=updatedAt`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            email: { stringValue: user.email },
            displayName: { stringValue: user.displayName || user.email.split('@')[0] || '' },
            updatedAt: { timestampValue: now },
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[user-sync] Update error:', errText);
        return NextResponse.json({ success: false, error: 'Failed to update user doc' }, { status: 500 });
      }
    } else {
      // Doc doesn't exist — create it with all fields
      const fields: Record<string, unknown> = {
        email: { stringValue: user.email },
        displayName: { stringValue: user.displayName || user.email.split('@')[0] || '' },
        tier: { stringValue: 'free' },
        suspended: { booleanValue: false },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      };

      const res = await fetch(getUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[user-sync] Create error:', errText);
        return NextResponse.json({ success: false, error: 'Failed to create user doc' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User data synced successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[user-sync] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
