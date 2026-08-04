/**
 * POST /api/license-keys/reactivate
 *
 * Admin-only: reactivate a used/revoked license key.
 *
 * Request body: { idToken: string, key: string }
 *
 * Response: { success: boolean, error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { reactivateLicenseKey } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin-auth';

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

    const admin = await isAdmin(idToken);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await reactivateLicenseKey(key);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[license-keys-reactivate] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
