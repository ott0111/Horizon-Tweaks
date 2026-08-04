/**
 * POST /api/user/tier
 *
 * Read a user's tier from Firestore (fallback when custom claims aren't set).
 * Request body: { idToken: string }
 * Response: { tier: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getConfig } from '@/lib/firebase-admin';

const FIREBASE_WEB_API_KEY = 'AIzaSyAX7AMem_7bEOg_oBUS-pYmIqJKv5WYJAY';

async function getUserData(idToken: string): Promise<{ localId: string } | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId: string }> };
    return data.users?.[0] || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };
    if (!idToken) {
      return NextResponse.json({ tier: 'free' });
    }

    const user = await getUserData(idToken);
    if (!user) {
      return NextResponse.json({ tier: 'free' });
    }

    const token = await getAccessToken();
    const projectId = getConfig().projectId;

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.localId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ tier: 'free' });
    }

    const doc = (await res.json()) as {
      fields?: { tier?: { stringValue?: string } };
    };

    const tier = doc.fields?.tier?.stringValue || 'free';
    return NextResponse.json({ tier });
  } catch {
    return NextResponse.json({ tier: 'free' });
  }
}
