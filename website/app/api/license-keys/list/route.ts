/**
 * POST /api/license-keys/list
 *
 * Admin-only: lists all license keys in Firestore.
 *
 * Request body: { idToken: string }
 *
 * Response: { success: boolean, keys?: LicenseKeyResult[], error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { listLicenseKeys } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Missing idToken' },
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

    const keys = await listLicenseKeys();

    return NextResponse.json({ success: true, keys });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[license-keys-list] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
