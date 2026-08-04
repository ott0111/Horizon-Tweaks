/**
 * POST /api/license-keys/create-batch
 *
 * Admin-only: creates a batch of license keys in Firestore.
 *
 * Request body: { idToken: string, app: string, tier?: string, count: number }
 *   - idToken: Firebase ID token (must be admin)
   *   - app: "optimizer" | "impulse-ping" | "impulse-keyboard"
 *   - tier: "standard" | "pro" | "ultimate" (only for optimizer)
 *   - count: number of keys to create (max 100)
 *
 * Response: { success: boolean, keys?: LicenseKeyResult[], error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createLicenseKeyBatch } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin-auth';

const VALID_APPS = ['optimizer', 'impulse-ping', 'impulse-keyboard'] as const;
const OPTIMIZER_TIERS = ['standard', 'pro', 'ultimate'] as const;

export async function POST(request: NextRequest) {
  try {
    const { idToken, app, tier, count } = (await request.json()) as {
      idToken: string;
      app: string;
      tier?: string;
      count: number;
    };

    if (!idToken || !app || !count) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: idToken, app, count' },
        { status: 400 }
      );
    }

    if (!VALID_APPS.includes(app as any)) {
      return NextResponse.json(
        { success: false, error: `Invalid app. Must be one of: ${VALID_APPS.join(', ')}` },
        { status: 400 }
      );
    }

    if (app === 'optimizer') {
      if (!tier || !OPTIMIZER_TIERS.includes(tier as any)) {
        return NextResponse.json(
          { success: false, error: 'Tier is required for optimizer keys. Must be "standard", "pro", or "ultimate"' },
          { status: 400 }
        );
      }
    }

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: 'Count must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Verify admin
    const admin = await isAdmin(idToken);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only the admin can create license keys.' },
        { status: 403 }
      );
    }

    const keys = await createLicenseKeyBatch(count, app, tier || null, 'admin');

    return NextResponse.json({
      success: true,
      keys,
      count: keys.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[license-keys-create-batch] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
