import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? process.env.PAYPAL_CLIENT_ID ?? null;
    const planIdStandard = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_STANDARD ?? process.env.PAYPAL_PLAN_ID_STANDARD ?? process.env.PAYPAL_STANDARD_PLAN_ID ?? null;
    const planIdPro = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_PRO ?? process.env.PAYPAL_PLAN_ID_PRO ?? process.env.PAYPAL_PRO_PLAN_ID ?? null;
    const planIdUltimate = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_ULTIMATE ?? process.env.PAYPAL_PLAN_ID_ULTIMATE ?? process.env.PAYPAL_ULTIMATE_PLAN_ID ?? null;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'PayPal client ID not configured' }, { status: 500 });
    }

    return NextResponse.json({ success: true, clientId, planIdStandard, planIdPro, planIdUltimate });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to read PayPal config' }, { status: 500 });
  }
}
