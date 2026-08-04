import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'aayan.b.asim@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const { idToken, userId, email: inputEmail, tier } = (await request.json()) as {
      idToken: string;
      userId?: string;
      email?: string;
      tier: string;
    };

    if (!idToken || (!userId && !inputEmail) || !tier) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: need userId or email, and tier' },
        { status: 400 }
      );
    }

    if (!['free', 'standard', 'pro', 'ultimate', 'admin'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be free, standard, pro, ultimate, or admin' },
        { status: 400 }
      );
    }

    const { getAccessToken, setCustomClaims, updateFirestoreTier, getConfig } = await import('@/lib/firebase-admin');
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

    // Determine the user's localId — if we got an email, look it up
    let localId = userId || '';
    
    if (!localId && inputEmail) {
      // Look up user by email
      const emailLookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: [inputEmail] }),
        }
      );

      if (!emailLookupRes.ok) {
        return NextResponse.json(
          { success: false, error: `User not found with email: ${inputEmail}` },
          { status: 404 }
        );
      }

      const emailData = (await emailLookupRes.json()) as { users: Array<{ localId: string }> };
      const foundUser = emailData.users?.[0];
      if (!foundUser) {
        return NextResponse.json(
          { success: false, error: `No user found with email: ${inputEmail}` },
          { status: 404 }
        );
      }
      localId = foundUser.localId;
    }

    if (!localId) {
      return NextResponse.json(
        { success: false, error: 'Could not determine user ID' },
        { status: 400 }
      );
    }

    // Update the user's tier
    await setCustomClaims(localId, { tier });
    await updateFirestoreTier(localId, tier);

    console.log(`[admin] Updated user ${localId} to tier ${tier}`);

    return NextResponse.json({
      success: true,
      message: `User tier updated to ${tier}`,
      userId: localId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[admin-update-tier] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
