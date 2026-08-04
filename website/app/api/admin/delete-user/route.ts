/**
 * POST /api/admin/delete-user
 *
 * Admin-only: permanently delete a user account from Firebase Auth and Firestore.
 *
 * Request body: { idToken: string, userId: string }
 *
 * Response: { success: boolean, error?: string }
 */
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'aayan.b.asim@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const { idToken, userId } = (await request.json()) as {
      idToken: string;
      userId: string;
    };

    if (!idToken || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: idToken, userId' },
        { status: 400 }
      );
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

    // Prevent admin from deleting themselves
    if (userId === lookupData.users?.[0]?.email) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }

    // 1. Delete from Firebase Auth
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ localId: userId }),
      }
    );

    if (!authRes.ok) {
      const errText = await authRes.text();
      return NextResponse.json(
        { success: false, error: `Failed to delete auth account: ${errText}` },
        { status: 500 }
      );
    }

    // 2. Delete Firestore user document
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
    const fsRes = await fetch(firestoreUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!fsRes.ok && fsRes.status !== 404) {
      const errText = await fsRes.text();
      console.error('[admin-delete-user] Firestore delete error:', errText);
      // Don't fail — auth account was already deleted
    }

    // 3. Try to clean up subscriptions
    try {
      const subsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscriptions`;
      const subsRes = await fetch(subsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subsRes.ok) {
        const subsData = (await subsRes.json()) as {
          documents?: Array<{ name: string; fields?: Record<string, { stringValue?: string }> }>;
        };
        if (subsData.documents) {
          for (const doc of subsData.documents) {
            const uid = doc.fields?.uid?.stringValue;
            if (uid === userId && doc.name) {
              await fetch(doc.name, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => {});
            }
          }
        }
      }
    } catch {
      // Best effort cleanup
    }

    console.log(`[admin] Deleted user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'User permanently deleted',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[admin-delete-user] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
