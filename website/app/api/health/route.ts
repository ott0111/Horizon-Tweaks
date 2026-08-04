/**
 * GET /api/health
 *
 * Quick health check that tests Firebase Admin connectivity.
 * Returns status of: Firebase access token, Firestore access, and config.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Test config
  try {
    const { getConfig } = await import('@/lib/firebase-admin');
    const config = getConfig();
    results.config = { ok: true, projectId: config.projectId, clientEmail: config.clientEmail };
  } catch (e: any) {
    results.config = { ok: false, error: e.message };
  }

  // 2. Test access token
  try {
    const { getAccessToken } = await import('@/lib/firebase-admin');
    const token = await getAccessToken();
    results.accessToken = { ok: true };
  } catch (e: any) {
    results.accessToken = { ok: false, error: e.message };
  }

  // 3. Test Firestore read (license_keys collection)
  try {
    const { getAccessToken, getConfig } = await import('@/lib/firebase-admin');
    const token = await getAccessToken();
    const projectId = getConfig().projectId;
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys?pageSize=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      results.firestore = { ok: true };
    } else {
      const errText = await res.text();
      results.firestore = { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }
  } catch (e: any) {
    results.firestore = { ok: false, error: e.message };
  }

  const allOk = Object.values(results).every(r => r.ok);

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    results,
  }, { status: allOk ? 200 : 503 });
}
