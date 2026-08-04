import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'aayan.b.asim@gmail.com';

interface UserDoc {
  user_id: string;
  email: string;
  display_name: string;
  tier: string;
  created_at: string;
  subscriptionId?: string;
  discountCode?: string;
  suspended: boolean;
}

interface DiscountDoc {
  code: string;
  userId: string;
  tier: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  timestamp: string;
  subscriptionId?: string;
}

interface SubscriptionDoc {
  uid: string;
  tier: string;
  status: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

interface DiscountCodeDoc {
  code: string;
  discount_percent: number;
  max_uses: number;
  current_uses: number;
  created_by: string;
  created_at: string;
  expires_at?: string;
  active: boolean;
  description: string;
}

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

    // Verify admin by checking token
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
    const userEmail = lookupData.users?.[0]?.email;

    if (!userEmail || userEmail !== ADMIN_EMAIL) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all data in parallel
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    const [usersRes, usageRes, codesRes, subsRes, keysRes] = await Promise.all([
      fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/discount_usage`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/discount_codes`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/subscriptions`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/license_keys`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const usersData = usersRes.ok ? await usersRes.json() : { documents: [] };
    const usageData = usageRes.ok ? await usageRes.json() : { documents: [] };
    const codesData = codesRes.ok ? await codesRes.json() : { documents: [] };
    const subsData = subsRes.ok ? await subsRes.json() : { documents: [] };
    const keysData = keysRes.ok ? await keysRes.json() : { documents: [] };

    // Parse users
    const users: UserDoc[] = (usersData.documents || []).map((doc: any) => extractFields(doc));

    // Parse discount usage
    const usageRecords: DiscountDoc[] = (usageData.documents || []).map((doc: any) => extractFields(doc));

    // Parse discount codes
    const discountCodes = (codesData.documents || []).map((doc: any) => {
      const fields = extractFields(doc);
      return {
        id: doc.name?.split('/').pop() || '',
        ...fields,
      };
    });

    // Parse subscriptions
    const subscriptions: SubscriptionDoc[] = (subsData.documents || []).map((doc: any) => extractFields(doc));

    // Parse license keys
    const licenseKeys = (keysData.documents || []).map((doc: any) => extractFields(doc));

    // Compute per-app license key stats
    const keysPerApp: Record<string, { total: number; redeemed: number }> = {};
    licenseKeys.forEach((k: any) => {
      const app = k.app || 'optimizer';
      if (!keysPerApp[app]) keysPerApp[app] = { total: 0, redeemed: 0 };
      keysPerApp[app].total++;
      if (k.status === 'used' || k.status === 'assigned') keysPerApp[app].redeemed++;
    });

    // Normalize old tier names
    const normalizeTier = (t: string) => {
      const map: Record<string, string> = { prime: 'standard', apex: 'ultimate', isPrime: 'standard', isApex: 'ultimate' };
      return map[t] || t || 'free';
    };

    // Compute analytics
    const tierCounts: Record<string, number> = {};
    users.forEach(u => {
      const t = normalizeTier(u.tier || 'free');
      tierCounts[t] = (tierCounts[t] || 0) + 1;
    });

    // Discount code usage per code
    const usagePerCode: Record<string, { uses: number; users: string[]; totalDiscount: number }> = {};
    usageRecords.forEach(r => {
      if (!usagePerCode[r.code]) {
        usagePerCode[r.code] = { uses: 0, users: [], totalDiscount: 0 };
      }
      usagePerCode[r.code].uses++;
      usagePerCode[r.code].users.push(r.userId);
      usagePerCode[r.code].totalDiscount += r.discountAmount || 0;
    });

    // Subscription by plan (including via discount)
    const subsByPlan: Record<string, number> = {};
    const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'active');
    activeSubs.forEach(s => {
      const plan = s.tier || 'unknown';
      subsByPlan[plan] = (subsByPlan[plan] || 0) + 1;
    });

    // Discount code usage timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsage = usageRecords.filter(r => new Date(r.timestamp) >= thirtyDaysAgo);

    // Build daily usage counts
    const dailyUsage: Record<string, number> = {};
    recentUsage.forEach(r => {
      const day = new Date(r.timestamp).toISOString().split('T')[0];
      dailyUsage[day] = (dailyUsage[day] || 0) + 1;
    });

    // Users who used discount codes (with details)
    const usersWithDiscounts = users.filter(u => u.discountCode || usageRecords.some(r => r.userId === u.user_id));
    const discountUserDetails = usersWithDiscounts.map(u => {
      const usage = usageRecords.filter(r => r.userId === u.user_id);
      return {
        userId: u.user_id,
        email: u.email,
        displayName: u.display_name,
        tier: u.tier,
        createdAt: u.created_at,
        discountCode: u.discountCode || (usage[0]?.code || ''),
        usedAt: usage[0]?.timestamp || '',
        totalSaved: usage.reduce((sum, r) => sum + (r.discountAmount || 0), 0),
        subscriptionLength: u.created_at
          ? Math.floor((Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers: users.length,
          totalSubscriptions: activeSubs.length,
          totalDiscountCodes: discountCodes.length,
          totalDiscountUsage: usageRecords.length,
          totalDiscountSaved: usageRecords.reduce((s, r) => s + (r.discountAmount || 0), 0),
        },
        tierCounts,
        subsByPlan,
        usagePerCode,
        dailyUsage,
        discountCodes: discountCodes.map((dc: any) => ({
          code: dc.code,
          discountPercent: dc.discount_percent,
          maxUses: dc.max_uses,
          currentUses: dc.current_uses,
          active: dc.active,
          description: dc.description,
          totalSaved: usageRecords
            .filter(r => r.code === dc.code)
            .reduce((sum: number, r: any) => sum + (r.discountAmount || 0), 0),
        })),
        discountUserDetails,
        recentUsage: recentUsage.slice(-100).map(r => ({
          code: r.code,
          userId: r.userId,
          tier: r.tier,
          amount: r.finalAmount,
          saved: r.discountAmount,
          timestamp: r.timestamp,
        })),
        licenseKeys: {
          perApp: keysPerApp,
          total: licenseKeys.length,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[admin-dashboard] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
