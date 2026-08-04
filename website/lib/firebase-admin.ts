/**
 * Firebase Admin REST API helper
 *
 * Uses Firebase's REST API (admin SDK equivalent) with a service account
 * to set custom claims and update Firestore documents.
 *
 * Required environment variables:
 *   FIREBASE_PROJECT_ID     (e.g. "photorecipe-7mf5z")
 *   FIREBASE_CLIENT_EMAIL   (e.g. "firebase-adminsdk-xxx@photorecipe-7mf5z.iam.gserviceaccount.com")
 *   FIREBASE_PRIVATE_KEY    (the RSA private key from the service account JSON)
 */
import jwt from 'jsonwebtoken';
import { createPrivateKey, randomBytes } from 'crypto';

function requiredEnv(name: string, fallback?: string): string {
  const val = process.env[name]?.trim();
  if (val) return val;
  if (fallback) return fallback;
  throw new Error(`Missing required env var: ${name}. Set it in your Vercel / deployment environment.`);
}

function cleanPemKey(raw: string): string {
  let key = raw;

  // 1. Strip surrounding quotes (single or double) and trim
  key = key.trim().replace(/^['"]|['"]$/g, '');

  // 2. Replace ALL escaped newline variants (\\n, \\r\n, \\\\n, etc.)
  //    Do this repeatedly in case of double-escaping
  for (let i = 0; i < 5; i++) {
    const prev = key;
    key = key.replace(/\\r\\n/g, '\n');
    key = key.replace(/\\n/g, '\n');
    key = key.replace(/\\\\r\\n/g, '\n');
    key = key.replace(/\\\\n/g, '\n');
    if (key === prev) break;
  }

  // 3. Normalize literal CRLF/CR line endings to LF
  key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 4. Extract PEM header, body, and footer — match greedily between them
  const pemRegex = /(-----BEGIN [^-]+-----)([\s\S]*?)(-----END [^-]+-----)/;
  const pemMatch = key.match(pemRegex);

  if (pemMatch) {
    const header = pemMatch[1];
    const footer = pemMatch[3];

    let body = pemMatch[2];

    // Convert URL-safe base64 back to standard base64
    // (copy-paste / env var systems sometimes corrupt + and / into - and _)
    body = body.replace(/_/g, '/').replace(/-/g, '+');

    // Strip everything that isn't a valid standard base64 char
    body = body.replace(/[^A-Za-z0-9+/=]/g, '');

    // Re-wrap into proper 64-character lines
    const lines = body.match(/.{1,64}/g) || [body];
    key = `${header}\n${lines.join('\n')}\n${footer}`;
  } else {
    // No PEM delimiters found — treat entire input as raw base64 body
    let body = key.replace(/_/g, '/').replace(/-/g, '+');
    body = body.replace(/[^A-Za-z0-9+/=]/g, '');
    const lines = body.match(/.{1,64}/g) || [body];
    key = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  return key;
}

export function getConfig() {
  const HARDCODED_PROJECT_ID = 'photorecipe-7mf5z';
  const HARDCODED_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@photorecipe-7mf5z.iam.gserviceaccount.com';
  const HARDCODED_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDttbBkfdpyq6OY\nYDsrAC5RuoME1puqBHmje/6v8yoMttzYbxgmJ9M80KFub5hUTbLpcU6hs0vrJn3Z\nsjoHD8E44iyvhmiBQ699zekRyYRRut19GatAQkIUTTFNtGZvq2JTDiNiNGksKb/V\nUrdKW1qVJSb7z2Id5AI0SGiSSl4Tr6uGJfxIOwydfoi7a++00wu0nBZvdePqir6V\n8oK05ZgF4i/3NvhX1knSzABKjVigZ2WDHy40mXORjRkp3+ECUidczZ1dq88hGPjO\n0o9ZqcmRpbiqt4HEipNWChRdoGtP27HpA0dZymWzEmbo0lfrB93Dq1tw6/Y8n9P2\nd5bfmUpDAgMBAAECggEABk5rqj7XLMj2Q3Sfco9EAKcSEsQex8Pr9jUJQgxmxoTo\nwaqGLtJKUwgLQFggPRxSmB7ewdYf4tKCmY6WO4Rk0T2EMfk+4dm0g4HoTQXWR394\nS3lYMbw67zmdCpKz+lfG+VfGrd72FgCFi63wxD2S3vdoBrDZyYaNsxVjW34y62gQ\nmJaMtFjCR9qm7raz5F6Yn+ivvBOoJXGbc17nXmeTzOcrsb5LGq/+xzmkAxkch+82\nIA4kVz2oJMorEsLB55tEiuDdt9DCCGHSf5CcVwN3dnaE34uGF3VHqQ6V3gAy9D4i\nsB/fx6b9X1qesnPP64ipqkTkk3KG7AritparxCraAQKBgQD47mokqUtQ9kvrkiWJ\nF0DDAvkMJNyhOwgvNZnV7Z498CvJybzqQ1u4kVqI9iez56E3Rmmz8AB+dU1+Y/y+\nMAt6iYaLev5gee5RaVXMzdB+pPbKt77rW/2M1tEESuctVpEVPg23D1gjFMhkOnVm\n12DfDNMMTqJ9IHDd3F8E1E0eqwKBgQD0dbM10fXTHwLkBxIwXysR8dYiuAm37BxX\nrJBrNihmxlrTls3CKAwFMtqb7rwUE7Uws3FL7exJj1f340MJvLRlPtlvoCdFQhVr\ngt68tkg9rvGUUe5Vk6MklROHJwhqFJ2dtZNrD1bSLNFdaz7AfGafQ58nbWm2kn51\nGX/hVOyiyQKBgQCZkgQbj/GuBfR6ZRQRCi5i4H+idU9DjHaVIV1BdDFuhq+M8o9A\nesOoDswquKlvvJNh1We6oXK8kUN4mNjAwEUkmJlPjVZHUJGs2e4bxlE9ACpcj5US\nABNhAtm56zfJaaFh2IF/kNDP+69Q3hu1kWPq1y+QZSarSQs4ZA6enRbitwKBgQCA\n3hse4BPqu4pWkrOv9DtMNmRf4QyefEVkon9vRRl/NEllCTZmh53uj6RWVz+mhc0a\nYz3yfPX2wS3qa09HrsaaKMuO4KpTBEcuacrpSF5Exhhry9UMH8v82Ol2cckpwrxk\nCvgvk+J84UttJ7/o0Kt4gblAm5kCua8YI90Z+B7WoQKBgQCbip/3PYGH99kdsv5B\nVUav8WAgY25XUoOu2DNOE5pczB9z/GBSn4sjHDDOHxavPKNOhMf6tRlHNdPgy8Y3\nk7WD3999ZpnqFwMCheDWD1BmatuL1U1JtmN888bGQeifL8gkm0jBbb7yTvHY368I\nCyAeXe4JuBwZHnyu+KgWnXVPxw==\n-----END PRIVATE KEY-----\n';

  return {
    projectId: requiredEnv('FIREBASE_PROJECT_ID', HARDCODED_PROJECT_ID),
    clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL', HARDCODED_CLIENT_EMAIL),
    privateKey: (() => {
      // ALWAYS use hardcoded key — ignore env var completely
      // The env var on Vercel contains a WRONG key that causes DECODER errors
      let key = cleanPemKey(HARDCODED_PRIVATE_KEY);

      // Try validating with createPrivateKey
      // If PKCS#8 (-----BEGIN PRIVATE KEY-----) fails, try re-wrapping as PKCS#1
      try {
        createPrivateKey({ key, format: 'pem' });
      } catch (firstErr) {
        // Attempt PKCS#1 wrapping if the key body looks like it might be RSA
        const bodyMatch = key.match(/(-----BEGIN [^-]+-----)([\s\S]*?)(-----END [^-]+-----)/);
        if (bodyMatch) {
          const body = bodyMatch[2].replace(/\s+/g, '');
          // If it was PKCS#8 but actually PKCS#1, try wrapping differently
          if (bodyMatch[1].includes('PRIVATE KEY') && !bodyMatch[1].includes('RSA PRIVATE KEY')) {
            const pkcs1Key = `-----BEGIN RSA PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join('\n') || body}\n-----END RSA PRIVATE KEY-----`;
            try {
              createPrivateKey({ key: pkcs1Key, format: 'pem' });
              key = pkcs1Key; // PKCS#1 worked
            } catch {
              // Both failed — fall through to final error
            }
          }
        }

        // Final validation attempt
        try {
          createPrivateKey({ key, format: 'pem' });
        } catch (e) {
          const keyPreview = key.substring(0, 80) + '...';
          throw new Error(
            `FIREBASE_PRIVATE_KEY is not a valid RSA private key. ` +
            `Make sure the env var contains the full PEM-formatted key from your Firebase service account JSON ` +
            `(the "private_key" field — the whole thing including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----). ` +
            `Key starts with: "${keyPreview}". ` +
            `Parse error: ${(e as Error).message}`
          );
        }
      }

      return key;
    })()
  };
}

/**
 * Get an OAuth2 access token for the Firebase service account.
 * Uses a self-signed JWT assertion (same approach as the Tauri desktop app).
 */
export async function getAccessToken(): Promise<string> {
  const { projectId, clientEmail, privateKey } = getConfig();

  const now = Math.floor(Date.now() / 1000);
  let assertion: string;
  try {
    assertion = jwt.sign(
      {
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope:
          'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
      },
      privateKey,
      { algorithm: 'RS256' }
    );
  } catch (e) {
    throw new Error(
      `Failed to sign Firebase JWT: ${(e as Error).message}. ` +
      `This usually means FIREBASE_PRIVATE_KEY env var is missing or corrupted. ` +
      `Re-download the service account JSON from Firebase Console > Project Settings > Service Accounts.`
    );
  }

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firebase OAuth token error: ${errText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Set custom claims (including tier) on a Firebase user.
 * This is the server-side equivalent of admin.auth().setCustomUserClaims().
 */
export async function setCustomClaims(
  localId: string,
  claims: Record<string, unknown>
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        localId,
        customAttributes: JSON.stringify(claims),
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firebase setCustomClaims error: ${errText}`);
  }
}

/**
 * Update the user's tier field in Firestore.
 * Also updates updatedAt timestamp and ensures email/displayName are stored.
 */
export async function updateFirestoreTier(
  userId: string,
  tier: string,
  email?: string,
  displayName?: string
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  // Build field masks and fields dynamically
  const fieldPaths = ['tier', 'updatedAt'];
  const fields: Record<string, unknown> = {
    tier: { stringValue: tier },
    updatedAt: { timestampValue: now },
  };

  if (email) {
    fieldPaths.push('email');
    fields.email = { stringValue: email };
  }
  if (displayName) {
    fieldPaths.push('displayName');
    fields.displayName = { stringValue: displayName };
  }

  const maskParam = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?${maskParam}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  // 404 means the user doc doesn't exist yet — that's ok, we'll skip
  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Firestore update tier error: ${errText}`);
  }
}

/**
 * Store a PayPal subscription ID mapped to a user in Firestore.
 * This lets the webhook look up the user when subscription events fire.
 */
export async function updateFirestoreSubscription(
  subscriptionId: string,
  data: { uid: string; tier: string; status: string; provider?: string }
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  const fields: Record<string, unknown> = {
    uid: { stringValue: data.uid },
    tier: { stringValue: data.tier },
    status: { stringValue: data.status },
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
  };

  if (data.provider) {
    fields.provider = { stringValue: data.provider };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscriptions/${subscriptionId}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore subscription error: ${errText}`);
  }
}

/**
 * Look up a subscription document from Firestore by subscription ID.
 * Used by the webhook to find the user when PayPal sends events.
 */
export async function getFirestoreSubscription(
  subscriptionId: string
): Promise<{ uid: string; tier: string; status: string; provider?: string | null } | null> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscriptions/${subscriptionId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore get subscription error: ${errText}`);
  }

  const doc = (await res.json()) as {
    fields?: {
      uid?: { stringValue: string };
      tier?: { stringValue: string };
      status?: { stringValue: string };
      provider?: { stringValue: string };
    };
  };

  if (!doc.fields) return null;

  return {
    uid: doc.fields.uid?.stringValue || '',
    tier: doc.fields.tier?.stringValue || '',
    status: doc.fields.status?.stringValue || '',
    provider: doc.fields.provider?.stringValue || null,
  };
}

/**
 * Update the Firestore subscription status (e.g. 'ACTIVE' â†’ 'CANCELLED').
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscriptions/${subscriptionId}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        updatedAt: { timestampValue: now },
      },
    }),
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Firestore update subscription status error: ${errText}`);
  }
}

/**
 * Store the subscription ID on the user's Firestore document for easy lookups.
 */
export async function updateFirestoreUserSubscriptionId(
  userId: string,
  subscriptionId: string | null
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=subscriptionId&updateMask.fieldPaths=updatedAt`;

  const fields: Record<string, unknown> = {
    updatedAt: { timestampValue: now },
  };
  if (subscriptionId) {
    fields.subscriptionId = { stringValue: subscriptionId };
  } else {
    fields.subscriptionId = { nullValue: null };
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Firestore update user subscriptionId error: ${errText}`);
  }
}

/**
 * Look up a user's Firestore document to find their active subscription ID.
 */
export async function getUserSubscriptionId(
  userId: string
): Promise<string | null> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;

  const doc = (await res.json()) as {
    fields?: {
      subscriptionId?: { stringValue: string };
    };
  };

  return doc.fields?.subscriptionId?.stringValue || null;
}

/**
 * Full flow: set custom claims + update Firestore for a user.
 * Returns the user's email from token verification.
 */
export async function grantTier(
  idToken: string,
  tier: string
): Promise<{ localId: string; email: string }> {
  // 1. Verify the ID token and get user info
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

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
    const errText = await lookupRes.text();
    throw new Error(`Token verification error: ${errText}`);
  }

  const lookupData = (await lookupRes.json()) as {
    users: Array<{ localId: string; email: string }>;
  };
  const user = lookupData.users?.[0];
  if (!user) {
    throw new Error('No user found for the provided token');
  }

  // 2. Set custom claims with the new tier
  await setCustomClaims(user.localId, { tier });

  // 3. Update Firestore user document with email
  await updateFirestoreTier(user.localId, tier, user.email);

  return { localId: user.localId, email: user.email };
}

// ─────────────────────────────────────────────────────────
// LICENSE KEY FUNCTIONS
// ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-strong random license key.
 * Format: XXXXX-XXXXX-XXXXX-XXXXX
 */
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const bytes = randomBytes(1);
      s += chars[bytes[0] % chars.length];
    }
    return s;
  };
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

interface LicenseKeyDoc {
  key: string;
  app: string;
  tier?: string;
  status: 'available' | 'assigned' | 'used' | 'revoked';
  createdBy?: string;
  createdAt: string;
  assignedTo?: string;
  assignedEmail?: string;
  assignedAt?: string;
  usedBy?: string;
  usedAt?: string;
  subscriptionId?: string;
  reactivatedAt?: string;
}

interface LicenseKeyResult {
  key: string;
  app: string;
  tier?: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  assignedTo?: string;
  assignedEmail?: string;
  assignedAt?: string;
  usedBy?: string;
  usedAt?: string;
  subscriptionId?: string;
}

/**
 * Create a batch of license keys in Firestore.
 */
export async function createLicenseKeyBatch(
  count: number,
  app: string,
  tier: string | null,
  createdBy: string
): Promise<LicenseKeyResult[]> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();
  const results: LicenseKeyResult[] = [];

  const batchSize = count;
  for (let i = 0; i < batchSize; i++) {
    const key = generateLicenseKey();
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys?documentId=${key}`;

    const fields: Record<string, unknown> = {
      key: { stringValue: key },
      app: { stringValue: app },
      status: { stringValue: 'available' },
      createdBy: { stringValue: createdBy },
      createdAt: { timestampValue: now },
    };
    if (tier) {
      fields.tier = { stringValue: tier };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[license-keys] Failed to create key ${key}: ${errText}`);
      continue;
    }

    results.push({ key, app, tier: tier || undefined, status: 'available', createdBy, createdAt: now });
  }

  return results;
}

/**
 * Get an available license key for a given app (and optional tier).
 */
export async function getAvailableLicenseKey(
  app: string,
  tier?: string
): Promise<LicenseKeyResult | null> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const filters: any[] = [
    { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'available' } } },
    { fieldFilter: { field: { fieldPath: 'app' }, op: 'EQUAL', value: { stringValue: app } } },
  ];
  if (tier) {
    filters.push({ fieldFilter: { field: { fieldPath: 'tier' }, op: 'EQUAL', value: { stringValue: tier } } });
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'license_keys' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters,
          },
        },
        limit: 1,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore query error: ${errText}`);
  }

  const data = (await res.json()) as Array<{
    document?: {
      name: string;
      fields?: Record<string, { stringValue?: string; timestampValue?: string }>;
    };
  }>;

  const docs = data.filter((d: any) => d.document?.fields?.key);
  if (docs.length === 0) return null;

  const doc = docs[0].document!;
  const fields = doc.fields || {};

  return {
    key: fields.key?.stringValue || '',
    app: fields.app?.stringValue || app,
    tier: fields.tier?.stringValue || tier,
    status: fields.status?.stringValue || 'available',
    createdAt: fields.createdAt?.timestampValue || '',
  };
}

/**
 * Assign a license key to a user (mark as assigned, store userId).
 */
export async function assignLicenseKey(
  key: string,
  userId: string,
  userEmail: string,
  subscriptionId: string
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys/${key}?updateMask.fieldPaths=status&updateMask.fieldPaths=assignedTo&updateMask.fieldPaths=assignedEmail&updateMask.fieldPaths=assignedAt&updateMask.fieldPaths=subscriptionId`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: 'assigned' },
        assignedTo: { stringValue: userId },
        assignedEmail: { stringValue: userEmail },
        assignedAt: { timestampValue: now },
        subscriptionId: { stringValue: subscriptionId },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore assign key error: ${errText}`);
  }
}

/**
 * Mark a license key as used (redeemed by user).
 * Also stores the user's email for admin lookup.
 */
export async function redeemLicenseKey(
  key: string,
  userId: string,
  userEmail?: string
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys/${key}?updateMask.fieldPaths=status&updateMask.fieldPaths=usedBy&updateMask.fieldPaths=usedAt&updateMask.fieldPaths=assignedEmail&updateMask.fieldPaths=assignedTo`;

  const fields: Record<string, unknown> = {
    status: { stringValue: 'used' },
    usedBy: { stringValue: userId },
    usedAt: { timestampValue: now },
    assignedEmail: { stringValue: userEmail || userId },
    assignedTo: { stringValue: userId },
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore redeem key error: ${errText}`);
  }
}

/**
 * Reactivate a used/revoked license key (make it available again).
 */
export async function reactivateLicenseKey(
  key: string
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys/${key}?updateMask.fieldPaths=status&updateMask.fieldPaths=reactivatedAt`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: 'available' },
        reactivatedAt: { timestampValue: now },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore reactivate key error: ${errText}`);
  }
}

/**
 * List all license keys from Firestore (for admin).
 */
export async function listLicenseKeys(): Promise<LicenseKeyResult[]> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore list keys error: ${errText}`);
  }

  const data = (await res.json()) as {
    documents?: Array<{
      name: string;
      fields?: Record<string, { stringValue?: string; timestampValue?: string; integerValue?: string }>;
      createTime?: string;
    }>;
  };

  if (!data.documents) return [];

  return data.documents.map((doc) => {
    const f = doc.fields || {};
    return {
      key: f.key?.stringValue || '',
      app: f.app?.stringValue || 'optimizer',
      tier: f.tier?.stringValue,
      status: f.status?.stringValue || '',
      createdBy: f.createdBy?.stringValue,
      createdAt: f.createdAt?.timestampValue || doc.createTime || '',
      assignedTo: f.assignedTo?.stringValue,
      assignedEmail: f.assignedEmail?.stringValue,
      assignedAt: f.assignedAt?.timestampValue,
      usedBy: f.usedBy?.stringValue,
      usedAt: f.usedAt?.timestampValue,
      subscriptionId: f.subscriptionId?.stringValue,
    };
  });
}

/**
 * Look up a license key document.
 */
export async function getLicenseKey(
  key: string
): Promise<LicenseKeyResult | null> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys/${key}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore get key error: ${errText}`);
  }

  const doc = (await res.json()) as {
    fields?: Record<string, { stringValue?: string; timestampValue?: string }>;
  };

  if (!doc.fields) return null;

  const f = doc.fields;
  return {
    key: f.key?.stringValue || '',
    app: f.app?.stringValue || 'optimizer',
    tier: f.tier?.stringValue,
    status: f.status?.stringValue || '',
    createdBy: f.createdBy?.stringValue,
    createdAt: f.createdAt?.timestampValue || '',
    assignedTo: f.assignedTo?.stringValue,
    assignedEmail: f.assignedEmail?.stringValue,
    assignedAt: f.assignedAt?.timestampValue,
    usedBy: f.usedBy?.stringValue,
    usedAt: f.usedAt?.timestampValue,
    subscriptionId: f.subscriptionId?.stringValue,
  };
}

/**
 * Get the license key assignment info for a specific subscription.
 */
export async function getLicenseKeyBySubscription(
  subscriptionId: string
): Promise<LicenseKeyResult | null> {
  const keys = await listLicenseKeys();
  return keys.find(k => k.subscriptionId === subscriptionId) || null;
}

/**
 * Revoke a license key (set back to available after subscription cancels).
 */
export async function revokeLicenseKey(
  key: string
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/license_keys/${key}?updateMask.fieldPaths=status`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: 'revoked' },
      },
    }),
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Firestore revoke key error: ${errText}`);
  }
}

/**
 * Get all license keys assigned to a user.
 */
export async function getUserLicenseKeys(uid: string): Promise<LicenseKeyResult[]> {
  const keys = await listLicenseKeys();
  return keys.filter(k => k.assignedTo === uid || k.usedBy === uid);
}

/**
 * Update a user's Firestore document to grant access to a specific app.
 */
export async function updateFirestoreAppAccess(
  userId: string,
  app: string
): Promise<void> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;
  const now = new Date().toISOString();

  const fieldName = `app_${app.replace(/-/g, '_')}`;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=${fieldName}&updateMask.fieldPaths=updatedAt`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        [fieldName]: { booleanValue: true },
        updatedAt: { timestampValue: now },
      },
    }),
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Firestore update app access error: ${errText}`);
  }
}

/**
 * Look up a user by email to find their Firebase UID.
 */
export async function lookupUserByEmail(
  email: string
): Promise<{ localId: string; email: string } | null> {
  const token = await getAccessToken();
  const projectId = getConfig().projectId;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: [email] }),
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as {
    users?: Array<{ localId: string; email: string }>;
  };

  const user = data.users?.[0];
  if (!user) return null;

  return { localId: user.localId, email: user.email };
}
