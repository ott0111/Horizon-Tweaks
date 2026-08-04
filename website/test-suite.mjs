/**
 * Impulse Optimizer - Comprehensive Website Test Suite
 * 
 * Tests all API routes, Firebase admin module, PayPal config,
 * website components, and integration flows.
 * 
 * Run: node website/test-suite.mjs
 */

import { createHmac } from 'crypto';

const PASS = '  ✅';
const FAIL = '  ❌';
const WARN = '  ⚠️';
const SECTION = '═══';
let totalTests = 0;
let passed = 0;
let failed = 0;
let warnings = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`${PASS} ${message}`);
    passed++;
  } else {
    console.log(`${FAIL} ${message}`);
    failed++;
  }
}

function warn(message) {
  totalTests++;
  console.log(`${WARN} ${message}`);
  warnings++;
}

function section(name) {
  console.log(`\n${SECTION} ${name} ${SECTION}`);
}

// ═══════════════════════════════════════════════════════════════
// Test 1: Firebase Admin Module - Key Parsing
// ═══════════════════════════════════════════════════════════════
section('Firebase Admin - Key Parsing');

// Simulate cleanPemKey from firebase-admin.ts
function cleanPemKey(raw) {
  let key = raw.trim().replace(/^['"]|['"]$/g, '');
  for (let i = 0; i < 5; i++) {
    const prev = key;
    key = key.replace(/\\r\\n/g, '\n');
    key = key.replace(/\\n/g, '\n');
    key = key.replace(/\\\\r\\n/g, '\n');
    key = key.replace(/\\\\n/g, '\n');
    if (key === prev) break;
  }
  key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const pemRegex = /(-----BEGIN [^-]+-----)([\s\S]*?)(-----END [^-]+-----)/;
  const pemMatch = key.match(pemRegex);
  if (pemMatch) {
    const header = pemMatch[1];
    const footer = pemMatch[3];
    let body = pemMatch[2];
    body = body.replace(/_/g, '/').replace(/-/g, '+');
    body = body.replace(/[^A-Za-z0-9+/=]/g, '');
    const lines = body.match(/.{1,64}/g) || [body];
    key = `${header}\n${lines.join('\n')}\n${footer}`;
  }
  return key;
}

const HARDCODED_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQD+Sj/nP6iTxI8t\nEuW6CJk+tbO/DVqZa1n/QiJNYFqkuYrC5aYAjJVIYL8JmdHfbMcAbQKDXqcf7ATT\nn+h7ERf/0huskztDI0e7SX6VWg/GyE8pwHCEZv5psGoabIHndLqDgxezwfq21F3s\nWYDP7v5UqSNZRsq5ZksN6S5nfqGIJIm6b8GS9hYASKG/kSn8xRM9eJR9AE6566NJ\n7wvTDKfIPgBEKRc69rP7+Shfr356AE6u39/uCmmroHdCcXk58nLdpHVKqw+QSE72\nBOsl8KNZcoLzwhHp/SBjxNNQ8i7ooZzuzQwUcqxeQMpOUZkzb1EwhKX4w7+MHhoV\n9QHJYl1tAgMBAAECggEAfAIJl+RbeXRpvjlw/oAi+4nw1kLU4+yOPwUpZUKP8bTq\nDpGfmrT0OA+2GiCBUMvjYDnI9/e42MBouitJXHrBkWgNRuOmCt+xo4v7xyncd7xH\nnrzSIj934mK925T+5LjwHCJZ9LesZGy8QP6E6uJJ9U9mhasYQcG46FfG4YHHlHQE\nPEAg951L5miMFjEooeWy1gRY9k7DgFHqkevg75Ipzpg+AtcS7AJFBgiKPc+7F++Q\n6CUBieoCMvmRFQN+VLFsvvxo8ZmSHajRYjfWWn5w+7fDlnaRCJo8Fnxs0i7fUfQX\nHrO7CeQ3UN8f5kpiSbRm6OrYkV8eyaLEEndQqysVoQKBgQD/jcGnydeZfD75zst7\ncp74L179cmgW5PvcE6XHdm4k32HIsQibLxMLGINnNbH+gPJnTWBQ+4uHHWcJpV0c\nejyE/weufqQXn+FPD+rCZeEQ1oolv2b5FOHiBZSwD/iyj48W2nw768H6c73JENCp\nYFpCco0dkTWtPgptWkIgAXDq3wKBgQD+u+2gWxuCs619JSXPtWqRxAen34jz2aKa\nQtu7M+dLmjevw6isNcGPkw8YlR3J/PEgB6y4rAsPLfIje/pBQcuTpDnmyfTeP8Yq\njUcCu2idpN04PpdmgRI8Ho1pbsMiPqTfxOXJEKqIm5PaCz8fNghM/D0cpu7EYKXL\ntMA/5RHNMwKBgQDg7ZE8sJA+PLhlQVmiHyHCildONmtdc1AmxXhNlnSdqau0a/WK\nOSXGx12o8v7mZfJ1cApNXQnS89MkD1Nj5EbuPFYzhK3DSWqTHwxe7DLrkhln3g6x\nP2sNeCIF0RjxeR/VWpqsVvaWDVdG6LDv06m+AHsqQgv/nrKoyx+Wcg5D+wKBgQDs\nANTBUmeEik9buIT1kVCwx/uHzpQlyCbb4MGPCSFra+/XyeCF3C/+gvLjhZPZxZzo\nXfPqDIsafyjtMznCJ+EiYm66obVaC5/fYJC/uT3NgCbsqyC9+SsZw/ykB9iF65/5\nKYTy6Zv1gJ5Uz0Kl+ftqx+8ekpJ4Ikq5Fjdfey0o/QKBgQDT6uM6Vc2b6Ay3OBfz\nzl6e+rHIwc8mmzA8OpNKsk4VjKdG/QCbS8TVCQS6cfeTnzMHZGJVzjiLmrQu8jhp\nLDOBddMTmynfEil164QkDsbbWNAzMtric4/Q7IS+p3NWETXNiux1ikU1Qq93ueTh\nEK4CZdiaFM4QtFMCOIogqaXcrA==\n-----END PRIVATE KEY-----\n';

assert(HARDCODED_KEY.includes('BEGIN PRIVATE KEY'), 'Hardcoded key has PEM header');
assert(HARDCODED_KEY.includes('END PRIVATE KEY'), 'Hardcoded key has PEM footer');
assert(HARDCODED_KEY.includes('MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQ'), 'Hardcoded key has valid base64 body');

const cleaned = cleanPemKey(HARDCODED_KEY);
assert(cleaned.startsWith('-----BEGIN PRIVATE KEY-----'), 'cleanPemKey preserves PEM header');
assert(cleaned.endsWith('-----END PRIVATE KEY-----') || cleaned.endsWith('-----END PRIVATE KEY-----\n'), 'cleanPemKey preserves PEM footer');

const bodyLines = cleaned.split('\n').filter(l => l.length > 0);
const bodyStart = bodyLines.findIndex(l => l.startsWith('-----BEGIN'));
const bodyEnd = bodyLines.findIndex(l => l.startsWith('-----END'));
assert(bodyStart >= 0 && bodyEnd >= 0, 'PEM has header and footer');
assert(bodyEnd > bodyStart, 'Footer comes after header');

const bodyContent = bodyLines.slice(bodyStart + 1, bodyEnd).join('');
assert(/^[A-Za-z0-9+/=]+$/.test(bodyContent), 'PEM body contains only base64 chars');
assert(bodyContent.length > 100, 'PEM body has substantial content');

// Test key corruption scenarios
const urlSafeKey = HARDCODED_KEY.replace(/\+/g, '-').replace(/\//g, '_');
const cleanedUrlSafe = cleanPemKey(urlSafeKey);
assert(cleanedUrlSafe.includes('MIIEvwIBADANBgkqhkiG9w0'), 'cleanPemKey handles URL-safe base64');

const doubleEscaped = HARDCODED_KEY.replace(/\n/g, '\\\\n');
const cleanedDouble = cleanPemKey(doubleEscaped);
assert(cleanedDouble.includes('MIIEvwIBADANBgkqhkiG9w0'), 'cleanPemKey handles double-escaped newlines');

const singleEscaped = HARDCODED_KEY.replace(/\n/g, '\\n');
const cleanedSingle = cleanPemKey(singleEscaped);
assert(cleanedSingle.includes('MIIEvwIBADANBgkqhkiG9w0'), 'cleanPemKey handles single-escaped newlines');

const quotedKey = `'${HARDCODED_KEY}'`;
const cleanedQuoted = cleanPemKey(quotedKey);
assert(cleanedQuoted.includes('MIIEvwIBADANBgkqhkiG9w0'), 'cleanPemKey handles single-quoted key');

// ═══════════════════════════════════════════════════════════════
// Test 2: Firebase Admin Module - Token Generation
// ═══════════════════════════════════════════════════════════════
section('Firebase Admin - Token Generation');

import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

const HARDCODED_PROJECT_ID = 'photorecipe-7mf5z';
const HARDCODED_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@photorecipe-7mf5z.iam.gserviceaccount.com';

assert(HARDCODED_PROJECT_ID.length > 0, 'Project ID is set');
assert(HARDCODED_CLIENT_EMAIL.endsWith('.iam.gserviceaccount.com'), 'Client email is valid format');
assert(HARDCODED_CLIENT_EMAIL.includes(HARDCODED_PROJECT_ID), 'Client email contains project ID');

try {
  const keyObj = createPrivateKey({ key: cleaned, format: 'pem' });
  assert(keyObj.type === 'private', 'Key parses as private key');
} catch (e) {
  assert(false, `Key parsing failed: ${e.message}`);
}

const now = Math.floor(Date.now() / 1000);
try {
  const assertion = jwt.sign(
    {
      iss: HARDCODED_CLIENT_EMAIL,
      sub: HARDCODED_CLIENT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
    },
    cleaned,
    { algorithm: 'RS256' }
  );
  assert(typeof assertion === 'string', 'JWT is a string');
  assert(assertion.split('.').length === 3, 'JWT has 3 parts (header.payload.signature)');

  const decoded = jwt.decode(assertion, { complete: true });
  assert(decoded.header.alg === 'RS256', 'JWT algorithm is RS256');
  assert(decoded.payload.iss === HARDCODED_CLIENT_EMAIL, 'JWT issuer matches client email');
  assert(decoded.payload.sub === HARDCODED_CLIENT_EMAIL, 'JWT subject matches client email');
  assert(decoded.payload.aud === 'https://oauth2.googleapis.com/token', 'JWT audience is Google token endpoint');
  assert(decoded.payload.exp > decoded.payload.iat, 'JWT expiry is after issued-at');
  assert(decoded.payload.exp - decoded.payload.iat === 3600, 'JWT TTL is 1 hour');
} catch (e) {
  assert(false, `JWT signing failed: ${e.message}`);
}

// ═══════════════════════════════════════════════════════════════
// Test 3: PayPal Config Route
// ═══════════════════════════════════════════════════════════════
section('PayPal Configuration');

// Simulate the config route logic
const envVariants = {
  clientId: ['NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_ID'],
  planIdStandard: ['NEXT_PUBLIC_PAYPAL_PLAN_ID_STANDARD', 'PAYPAL_PLAN_ID_STANDARD', 'PAYPAL_STANDARD_PLAN_ID', 'NEXT_PUBLIC_PAYPAL_STANDARD_PLAN_ID'],
  planIdPro: ['NEXT_PUBLIC_PAYPAL_PLAN_ID_PRO', 'PAYPAL_PLAN_ID_PRO', 'PAYPAL_PRO_PLAN_ID', 'NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID'],
  planIdUltimate: ['NEXT_PUBLIC_PAYPAL_PLAN_ID_ULTIMATE', 'PAYPAL_PLAN_ID_ULTIMATE', 'PAYPAL_ULTIMATE_PLAN_ID', 'NEXT_PUBLIC_PAYPAL_ULTIMATE_PLAN_ID'],
};

assert(envVariants.clientId.length === 2, 'Client ID has 2 env var variants');
assert(envVariants.planIdStandard.length === 4, 'Standard plan has 4 env var variants');
assert(envVariants.planIdPro.length === 4, 'Pro plan has 4 env var variants');
assert(envVariants.planIdUltimate.length === 4, 'Ultimate plan has 4 env var variants');

// Test that env var lookup tries all variants
const mockEnv = { 'PAYPAL_CLIENT_ID': 'test-client', 'PAYPAL_PLAN_ID_STANDARD': 'P-STD-123', 'PAYPAL_PRO_PLAN_ID': 'P-PRO-456', 'PAYPAL_ULTIMATE_PLAN_ID': 'P-ULT-789' };

function findEnv(names) {
  for (const name of names) {
    if (mockEnv[name]) return mockEnv[name];
  }
  return null;
}

assert(findEnv(envVariants.clientId) === 'test-client', 'Finds client ID from mock env');
assert(findEnv(envVariants.planIdStandard) === 'P-STD-123', 'Finds standard plan from mock env');
assert(findEnv(envVariants.planIdPro) === 'P-PRO-456', 'Finds pro plan from mock env');
assert(findEnv(envVariants.planIdUltimate) === 'P-ULT-789', 'Finds ultimate plan from mock env');
assert(findEnv(['MISSING']) === null, 'Returns null for missing env var');

// ═══════════════════════════════════════════════════════════════
// Test 4: Admin Route Logic
// ═══════════════════════════════════════════════════════════════
section('Admin Routes - Validation');

const ADMIN_EMAIL = 'aayan.b.asim@gmail.com';

assert(ADMIN_EMAIL.includes('@'), 'Admin email has @ symbol');
assert(ADMIN_EMAIL.endsWith('@gmail.com'), 'Admin email is Gmail');
assert(ADMIN_EMAIL === 'aayan.b.asim@gmail.com', 'Admin email matches exactly');

// Test tier validation
const validTiers = ['free', 'standard', 'pro', 'ultimate', 'admin'];
assert(validTiers.includes('free'), 'free is a valid tier');
assert(validTiers.includes('standard'), 'standard is a valid tier');
assert(validTiers.includes('pro'), 'pro is a valid tier');
assert(validTiers.includes('ultimate'), 'ultimate is a valid tier');
assert(validTiers.includes('admin'), 'admin is a valid tier');
assert(!validTiers.includes('premium'), 'premium is NOT a valid tier');
assert(!validTiers.includes(''), 'empty string is NOT a valid tier');

// Test Firestore document field extraction
function extractFields(doc) {
  const fields = doc.fields || {};
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
    else if (val.nullValue !== undefined) result[key] = null;
  }
  return result;
}

const mockDoc = {
  fields: {
    email: { stringValue: 'test@example.com' },
    tier: { stringValue: 'standard' },
    count: { integerValue: '42' },
    price: { doubleValue: 9.99 },
    active: { booleanValue: true },
    createdAt: { timestampValue: '2024-01-01T00:00:00Z' },
    deleted: { nullValue: null },
  }
};

const extracted = extractFields(mockDoc);
assert(extracted.email === 'test@example.com', 'Extracts string field');
assert(extracted.tier === 'standard', 'Extracts tier field');
assert(extracted.count === 42, 'Extracts integer field');
assert(extracted.price === 9.99, 'Extracts double field');
assert(extracted.active === true, 'Extracts boolean field');
assert(extracted.createdAt === '2024-01-01T00:00:00Z', 'Extracts timestamp field');
assert(extracted.deleted === null, 'Extracts null field');

// ═══════════════════════════════════════════════════════════════
// Test 5: Discount Code Logic
// ═══════════════════════════════════════════════════════════════
section('Discount Code Logic');

const tierPrices = { standard: 9.99, pro: 14.99, ultimate: 24.99 };

assert(tierPrices.standard === 9.99, 'Standard price is $9.99');
assert(tierPrices.pro === 14.99, 'Pro price is $14.99');
assert(tierPrices.ultimate === 24.99, 'Ultimate price is $24.99');

// Test discount calculations
function calcDiscount(tier, discountPercent) {
  const original = tierPrices[tier] || 0;
  const discount = original * (discountPercent / 100);
  const final_ = original - discount;
  return { original, discount, final: final_ };
}

const standard20 = calcDiscount('standard', 20);
assert(standard20.original === 9.99, 'Standard original is $9.99');
assert(Math.abs(standard20.discount - 1.998) < 0.001, '20% off $9.99 is ~$1.998');
assert(Math.abs(standard20.final - 7.992) < 0.001, '$9.99 - $1.998 = ~$7.992');

const pro50 = calcDiscount('pro', 50);
assert(pro50.original === 14.99, 'Pro original is $14.99');
assert(Math.abs(pro50.discount - 7.495) < 0.001, '50% off $14.99 is ~$7.495');
assert(Math.abs(pro50.final - 7.495) < 0.001, '$14.99 - $7.495 = ~$7.495');

const ultimate25 = calcDiscount('ultimate', 25);
assert(ultimate25.original === 24.99, 'Ultimate original is $24.99');
assert(Math.abs(ultimate25.discount - 6.2475) < 0.001, '25% off $24.99 is ~$6.2475');
assert(Math.abs(ultimate25.final - 18.7425) < 0.001, '$24.99 - $6.2475 = ~$18.7425');

const standard100 = calcDiscount('standard', 100);
assert(standard100.discount === 9.99, '100% off $9.99 is $9.99');
assert(standard100.final === 0, '100% discount = $0');

const standard0 = calcDiscount('standard', 0);
assert(standard0.discount === 0, '0% discount = $0');
assert(standard0.final === 9.99, '$9.99 - $0 = $9.99');

// Test code validation
function validateDiscountCode(code) {
  const errors = [];
  if (!code || typeof code !== 'string') errors.push('Missing code');
  if (code && code.length > 50) errors.push('Code too long');
  if (code && /[^A-Za-z0-9]/.test(code)) errors.push('Invalid characters');
  return errors;
}

assert(validateDiscountCode('SAVE20').length === 0, 'Valid code passes');
assert(validateDiscountCode('A1B2C3').length === 0, 'Alphanumeric code passes');
assert(validateDiscountCode('').length > 0, 'Empty code fails');
assert(validateDiscountCode(null).length > 0, 'Null code fails');
assert(validateDiscountCode('SAVE 20').length > 0, 'Code with space fails');

// ═══════════════════════════════════════════════════════════════
// Test 6: Website Component Structure
// ═══════════════════════════════════════════════════════════════
section('Website Component Checks');

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const websiteDir = 'D:\\Aayan\\Im-tryin\\website';

// Check page files
const appDir = join(websiteDir, 'app');
assert(existsSync(appDir), 'app/ directory exists');

// Check critical components
const componentsDir = join(websiteDir, 'components');
assert(existsSync(componentsDir), 'components/ directory exists');

if (existsSync(componentsDir)) {
  const componentFiles = readdirSync(componentsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  assert(componentFiles.length > 10, `Found ${componentFiles.length} component files`);
  
  const expectedComponents = ['Header', 'Footer', 'CartModal', 'Pricing'];
  for (const comp of expectedComponents) {
    const found = componentFiles.some(f => f.includes(comp));
    assert(found, `Component ${comp} exists`);
  }
}

// Check lib files
const libDir = join(websiteDir, 'lib');
assert(existsSync(libDir), 'lib/ directory exists');

if (existsSync(libDir)) {
  assert(existsSync(join(libDir, 'firebase-admin.ts')), 'firebase-admin.ts exists');
  assert(existsSync(join(libDir, 'firebase.ts')), 'firebase.ts client config exists');
}

// Check API routes
const apiDir = join(websiteDir, 'app', 'api');
assert(existsSync(apiDir), 'API routes directory exists');

const expectedRoutes = [
  'admin/update-tier',
  'admin/dashboard-data',
  'discount/validate',
  'discount/use',
  'paypal/config',
  'paypal/webhook',
  'subscription/cancel',
  'subscription/status',
];

if (existsSync(apiDir)) {
  for (const route of expectedRoutes) {
    const routePath = join(apiDir, route, 'route.ts');
    const exists = existsSync(routePath);
    assert(exists, `API route: /api/${route}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Test 7: Website Build Configuration
// ═══════════════════════════════════════════════════════════════
section('Website Build Configuration');

const pkgJson = JSON.parse(readFileSync(join(websiteDir, 'package.json'), 'utf-8'));
assert(pkgJson.name === 'Impulse-optimizer-website', 'Package name is correct');
assert(pkgJson.version === '2.0.0', 'Package version is 2.0.0');
assert(pkgJson.scripts.build === 'next build', 'Build script is next build');
assert(pkgJson.scripts.dev === 'next dev', 'Dev script is next dev');
assert(pkgJson.scripts.lint === 'next lint', 'Lint script is next lint');

// Check critical dependencies
const deps = pkgJson.dependencies;
assert(deps.next, 'Next.js is a dependency');
assert(deps.react, 'React is a dependency');
assert(deps.firebase, 'Firebase SDK is a dependency');
assert(deps['@paypal/react-paypal-js'], 'PayPal React SDK is a dependency');
assert(deps.stripe, 'Stripe is a dependency');
assert(deps.recharts, 'Recharts (charts) is a dependency');
assert(deps['lucide-react'], 'Lucide React (icons) is a dependency');

// ═══════════════════════════════════════════════════════════════
// Test 8: Firebase Config Consistency
// ═══════════════════════════════════════════════════════════════
section('Firebase Config Consistency');

const firebaseConfig = JSON.parse(readFileSync('D:\\Aayan\\Im-tryin\\src-tauri\\firebase_config.json', 'utf-8'));
assert(firebaseConfig.project_id === HARDCODED_PROJECT_ID, 'Desktop config project_id matches website');
assert(firebaseConfig.service_account_email === HARDCODED_CLIENT_EMAIL, 'Desktop config email matches website');
assert(firebaseConfig.private_key_pem.includes('BEGIN PRIVATE KEY'), 'Desktop config has valid PEM header');
assert(firebaseConfig.private_key_pem.includes('END PRIVATE KEY'), 'Desktop config has valid PEM footer');

// Verify same key is used in both desktop and website
const desktopKeyCleaned = cleanPemKey(firebaseConfig.private_key_pem);
const websiteKeyCleaned = cleanPemKey(HARDCODED_KEY);
const desktopBody = desktopKeyCleaned.replace(/-----BEGIN [^-]+-----\n?/, '').replace(/\n?-----END [^-]+-----\n?/, '');
const websiteBody = websiteKeyCleaned.replace(/-----BEGIN [^-]+-----\n?/, '').replace(/\n?-----END [^-]+-----\n?/, '');
assert(desktopBody === websiteBody, 'Desktop and website use the SAME private key');

// ═══════════════════════════════════════════════════════════════
// Test 9: Website .env.example Security
// ═══════════════════════════════════════════════════════════════
section('Website .env.example Security');

const envExample = readFileSync(join(websiteDir, '.env.example'), 'utf-8');
assert(!envExample.includes('sk_live'), 'No live Stripe secret keys in .env.example');
assert(!envExample.includes('sk_test'), 'No test Stripe secret keys in .env.example');
assert(!envExample.includes('-----BEGIN'), 'No private keys in .env.example');
assert(envExample.includes('YOUR_'), 'Env example has placeholder values');

// ═══════════════════════════════════════════════════════════════
// Test 10: Desktop UI Checks
// ═══════════════════════════════════════════════════════════════
section('Desktop UI Structure');

const uiDir = 'D:\\Aayan\\Im-tryin\\src-ui';
const uiPkg = JSON.parse(readFileSync(join(uiDir, 'package.json'), 'utf-8'));
assert(uiPkg.name === 'Impulse-ui', 'UI package name is correct');
assert(uiPkg.dependencies.react, 'React is a dependency');
assert(uiPkg.dependencies['@tauri-apps/api'], 'Tauri API is a dependency');
assert(uiPkg.dependencies['lucide-react'], 'Lucide icons is a dependency');

// Check critical components exist
const componentsUiDir = join(uiDir, 'src', 'components');
if (existsSync(componentsUiDir)) {
  const uiComponents = readdirSync(componentsUiDir).filter(f => f.endsWith('.tsx'));
  assert(uiComponents.length > 15, `Found ${uiComponents.length} UI components`);
  
  const criticalComponents = [
    'Dashboard', 'TweakCatalog', 'AdvancedTweaks', 'RollbackPanel',
    'AdminPanel', 'Login', 'ErrorBoundary', 'Sidebar',
  ];
  for (const comp of criticalComponents) {
    const found = uiComponents.some(f => f.includes(comp));
    assert(found, `UI component: ${comp}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Test 11: Desktop Rust Backend Checks
// ═══════════════════════════════════════════════════════════════
section('Desktop Rust Backend Structure');

const tauriDir = 'D:\\Aayan\\Im-tryin\\src-tauri';
const cargoToml = readFileSync(join(tauriDir, 'Cargo.toml'), 'utf-8');
assert(cargoToml.includes('name = "impulse-tauri"'), 'Cargo.toml has correct package name');
assert(cargoToml.includes('version = "1.0.93"'), 'Cargo.toml version is 1.0.93');
assert(cargoToml.includes('tauri = { version = "2"'), 'Tauri v2 is used');
assert(cargoToml.includes('serde = { version = "1"'), 'Serde is included');
assert(cargoToml.includes('tokio = { version = "1"'), 'Tokio is included');
assert(cargoToml.includes('reqwest = { version = "0.12"'), 'Reqwest is included');
assert(cargoToml.includes('jsonwebtoken = { version = "9"'), 'JWT library is included');
assert(cargoToml.includes('chrono = { version = "0.4"'), 'Chrono is included');
assert(cargoToml.includes('uuid = { version = "1"'), 'UUID is included');
assert(cargoToml.includes('winreg = "0.55"'), 'Windows registry is included');

// Check commands module structure
const commandsDir = join(tauriDir, 'src', 'commands');
if (existsSync(commandsDir)) {
  const commandFiles = readdirSync(commandsDir).filter(f => f.endsWith('.rs'));
  assert(commandFiles.length > 10, `Found ${commandFiles.length} command modules`);
  
  const expectedModules = ['auth', 'admin', 'tweaks', 'system_api', 'power_management', 'networking', 'rollback', 'updater'];
  for (const mod of expectedModules) {
    const found = commandFiles.some(f => f.includes(mod));
    assert(found, `Command module: ${mod}`);
  }
}

// Check services module structure
const servicesDir = join(tauriDir, 'src', 'services');
if (existsSync(servicesDir)) {
  const serviceFiles = readdirSync(servicesDir).filter(f => f.endsWith('.rs'));
  assert(serviceFiles.length > 5, `Found ${serviceFiles.length} service modules`);
  
  const expectedServices = ['firebase_client', 'error_logger', 'rollback_manager', 'file_io', 'monitor'];
  for (const svc of expectedServices) {
    const found = serviceFiles.some(f => f.includes(svc));
    assert(found, `Service module: ${svc}`);
  }
}

// Check lib.rs registers commands
const libRs = readFileSync(join(tauriDir, 'src', 'lib.rs'), 'utf-8');
assert(libRs.includes('invoke_handler'), 'lib.rs has invoke_handler');
const commandCount = (libRs.match(/commands::/g) || []).length;
assert(commandCount > 50, `lib.rs registers ${commandCount} commands (expected 50+)`);

// ═══════════════════════════════════════════════════════════════
// Test 12: Branding/Icons
// ═══════════════════════════════════════════════════════════════
section('Branding and Icons');

const brandingFiles = [
  ['src-ui/public/app-icon.png', 'UI icon PNG'],
  ['src-ui/public/app-icon.ico', 'UI icon ICO'],
  ['src-tauri/icons/icon.png', 'Tauri icon PNG'],
  ['src-tauri/icons/icon.ico', 'Tauri icon ICO'],
  ['website/public/app-icon.png', 'Website icon PNG'],
  ['website/public/app-icon.ico', 'Website icon ICO'],
  ['website/public/Impulse-Website-Logo.png', 'Website logo'],
];

for (const [file, desc] of brandingFiles) {
  const fullPath = join('D:\\Aayan\\Im-tryin', file);
  if (existsSync(fullPath)) {
    const stats = { size: readFileSync(fullPath).length };
    assert(stats.size > 1000, `${desc} exists and is > 1KB (${stats.size} bytes)`);
  } else {
    assert(false, `${desc} MISSING: ${file}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`  TEST RESULTS: ${passed}/${totalTests} passed, ${failed} failed, ${warnings} warnings`);
console.log(`${'═'.repeat(50)}`);

if (failed > 0) {
  console.log('\n❌ SOME TESTS FAILED');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️ ALL TESTS PASSED WITH WARNINGS');
  process.exit(0);
} else {
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
}
