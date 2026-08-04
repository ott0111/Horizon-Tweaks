/**
 * POST /api/admin/fix-users
 *
 * Admin-only: scans all Firebase Auth users and backfills their Firestore docs
 * with email and displayName if missing.
 *
 * Request body: { idToken: string }
 *
 * Response: { success: boolean, fixed: number, errors: number, error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'aayan.b.asim@gmail.com';

function extractFields(doc: any): Record<string, any> {
  const fields = doc.fields || {};
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    const v = val as Record<string, any>;
    if (v.stringValue !== undefined) result[key] = v.stringValue;
    else if (v.integerValue !== undefined) result[key] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) result[key] = v.doubleValue;
    else if (v.booleanValue !== undefined) result[key] = v.booleanValue;
    else if (v.timestampValue !== undefined) result[key] = v.timestampValue;
    else if (v.nullValue !== undefined) result[key] = null;
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };
    if (!idToken) {
      return NextResponse.json({ success: false, error: 'Missing idToken' }, { status: 400 });
    }

    const { getAccessToken, getConfig } = await import('@/lib/firebase-admin');
    const { projectId } = getConfig();

    const token = await getAccessToken();

    // Verify admin
    const lookupRes = await fetch(
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

    if (!lookupRes.ok) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const lookupData = (await lookupRes.json()) as { users: Array<{ email: string }> };
    const adminEmail = lookupData.users?.[0]?.email;

    if (!adminEmail || adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Get all Firebase Auth users
    const queryRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnUserInfo: true, maxResults: 500 }),
      }
    );

    if (!queryRes.ok) {
      const errText = await queryRes.text();
      return NextResponse.json({ success: false, error: `Failed to query users: ${errText}` }, { status: 500 });
    }

    const queryData = (await queryRes.json()) as {
      userInfo?: Array<{ localId: string; email: string; displayName?: string; createdAt?: string }>;
    };

    const authUsers = queryData.userInfo || [];

    // 2. Get all Firestore user docs
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`;
    const fsRes = await fetch(fsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const firestoreDocs: Record<string, any> = {};
    if (fsRes.ok) {
      const fsData = await fsRes.json();
      const docs = fsData.documents || [];
      for (const doc of docs) {
        const id = doc.name?.split('/').pop();
        if (id) {
          firestoreDocs[id] = extractFields(doc);
        }
      }
    }

    // 3. Fix missing data
    let fixed = 0;
    let errors = 0;

    for (const authUser of authUsers) {
      try {
        const uid = authUser.localId;
        const email = authUser.email || '';
        const displayName = authUser.displayName || email.split('@')[0] || 'User';

        const existing = firestoreDocs[uid];
        const needsFix = !existing || !existing.email || !existing.displayName;

        if (needsFix) {
          const now = new Date().toISOString();
          const fieldPaths = ['email', 'displayName', 'updatedAt'];
          const fields: Record<string, unknown> = {
            email: { stringValue: email },
            displayName: { stringValue: displayName },
            updatedAt: { timestampValue: now },
          };

          // If no doc exists at all, also set tier and createdAt
          if (!existing) {
            fieldPaths.push('tier', 'createdAt', 'suspended');
            fields.tier = { stringValue: 'free' };
            fields.createdAt = { timestampValue: now };
            fields.suspended = { booleanValue: false };
          }

          const maskParam = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
          const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?${maskParam}`;

          const updateRes = await fetch(url, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields }),
          });

          if (updateRes.ok) {
            fixed++;
            console.log(`[fix-users] Fixed user ${uid} (${email})`);
          } else {
            const errText = await updateRes.text();
            console.error(`[fix-users] Failed to fix user ${uid}: ${errText}`);
            errors++;
          }
        }
      } catch (e) {
        console.error(`[fix-users] Error processing user ${authUser.localId}:`, e);
        errors++;
      }
    }

    console.log(`[fix-users] Complete: ${fixed} fixed, ${errors} errors out of ${authUsers.length} users`);

    return NextResponse.json({
      success: true,
      fixed,
      errors,
      total: authUsers.length,
      message: `Fixed ${fixed} users (${errors} errors) out of ${authUsers.length} total`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[fix-users] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
