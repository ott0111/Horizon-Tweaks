import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, userId, tier, subscriptionId } = (await request.json()) as {
      code: string;
      userId: string;
      tier: string;
      subscriptionId?: string;
    };

    if (!code || !userId || !tier) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: code, userId, tier' },
        { status: 400 }
      );
    }

    const { getAccessToken, getConfig } = await import('@/lib/firebase-admin');
    const { projectId } = getConfig();

    const token = await getAccessToken();

    // 1. Find the discount code document
    const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/discount_codes`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch discount codes' },
        { status: 500 }
      );
    }

    const body = await listRes.json();
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

    const docName = found.name || '';
    const docId = docName.split('/').pop();
    const fields = found.fields || {};
    const currentUses = parseInt(fields.currentUses?.integerValue || '0', 10);
    const discountPercent = parseInt(fields.discountPercent?.integerValue || '0', 10);

    // Determine pricing
    const tierPrices: Record<string, number> = { standard: 9.99, pro: 14.99, ultimate: 24.99 };
    const originalAmount = tierPrices[tier] || 0;
    const discountAmount = originalAmount * (discountPercent / 100);
    const finalAmount = originalAmount - discountAmount;

    // 2. Increment currentUses
    if (docId) {
      const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/discount_codes/${docId}?updateMask.fieldPaths=currentUses&updateMask.fieldPaths=updatedAt`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            currentUses: { integerValue: (currentUses + 1).toString() },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      });
    }

    // 3. Record usage in discount_usage collection
    const usageUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/discount_usage`;
    const usageBody = {
      fields: {
        code: { stringValue: code.toUpperCase() },
        userId: { stringValue: userId },
        tier: { stringValue: tier },
        originalAmount: { doubleValue: originalAmount },
        discountAmount: { doubleValue: discountAmount },
        finalAmount: { doubleValue: finalAmount },
        timestamp: { timestampValue: new Date().toISOString() },
        ...(subscriptionId ? { subscriptionId: { stringValue: subscriptionId } } : {}),
      },
    };

    await fetch(usageUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(usageBody),
    });

    console.log(`[discount-use] Code ${code} used by ${userId} for ${tier}: ${discountPercent}% off ($${discountAmount.toFixed(2)} saved)`);

    return NextResponse.json({
      success: true,
      discount_percent: discountPercent,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[discount-use] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
