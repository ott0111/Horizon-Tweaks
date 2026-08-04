import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = (await request.json()) as { code: string };

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing discount code' },
        { status: 400 }
      );
    }

    const { getAccessToken, getConfig } = await import('@/lib/firebase-admin');
    const { projectId } = getConfig();

    const token = await getAccessToken();

    // Fetch all discount codes from Firestore
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/discount_codes`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch discount codes' },
        { status: 500 }
      );
    }

    const body = await res.json();
    const docs = body.documents || [];
    const upperCode = code.toUpperCase().trim();

    const found = docs.find((doc: any) => {
      const fields = doc.fields || {};
      const docCode = fields.code?.stringValue || '';
      return docCode.toUpperCase() === upperCode;
    });

    if (!found) {
      return NextResponse.json(
        { success: false, error: 'Discount code not found' },
        { status: 404 }
      );
    }

    const fields = found.fields || {};
    const active = fields.active?.booleanValue ?? false;
    const currentUses = parseInt(fields.currentUses?.integerValue || '0', 10);
    const maxUses = parseInt(fields.maxUses?.integerValue || '0', 10);
    const discountPercent = parseInt(fields.discountPercent?.integerValue || '0', 10);
    const codeStr = fields.code?.stringValue || code;
    const expiresAt = fields.expiresAt?.timestampValue || null;

    if (!active) {
      return NextResponse.json(
        { success: false, error: 'This discount code is no longer active' },
        { status: 400 }
      );
    }

    if (currentUses >= maxUses) {
      return NextResponse.json(
        { success: false, error: 'This discount code has reached its maximum uses' },
        { status: 400 }
      );
    }

    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (expDate < new Date()) {
        return NextResponse.json(
          { success: false, error: 'This discount code has expired' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      code: codeStr,
      discount_percent: discountPercent,
      max_uses: maxUses,
      current_uses: currentUses,
      description: fields.description?.stringValue || '',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[discount-validate] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
