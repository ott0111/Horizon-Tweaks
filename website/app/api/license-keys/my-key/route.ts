/**
 * POST /api/license-keys/my-key
 *
 * Returns all of the user's assigned license keys across all apps.
 *
 * Request body: { idToken: string }
 *
 * Response: { success: boolean, keys?: Array<{ key: string; app: string; tier?: string; status: string; assignedAt?: string }>, error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { listLicenseKeys } from '@/lib/firebase-admin';

async function getUserUid(idToken: string): Promise<string | null> {
  try {
    const { getAccessToken, getConfig } = await import('@/lib/firebase-admin');
    const token = await getAccessToken();
    const projectId = getConfig().projectId;

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId: string }> };
    return data.users?.[0]?.localId || null;
  } catch {
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

    const uid = await getUserUid(idToken);
    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Could not verify your account.' },
        { status: 401 }
      );
    }

    const keys = await listLicenseKeys();
    const myKeys = keys.filter(
      (k) => k.assignedTo === uid || k.usedBy === uid
    );

    return NextResponse.json({
      success: true,
      keys: myKeys.map(k => ({
        key: k.key,
        app: k.app || 'optimizer',
        tier: k.tier,
        status: k.status,
        assignedAt: k.assignedAt,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[license-keys-my-key] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
