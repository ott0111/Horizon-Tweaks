/**
 * Email sending utility using Resend API.
 *
 * One env var needed in Vercel:
 *   RESEND_API_KEY   — Your Resend API key from https://resend.com/api-keys
 *                      Starts with "re_..."
 *
 * Resend free tier: 100 emails/day, no credit card required.
 * Sign up at https://resend.com and create an API key in the dashboard.
 */

/**
 * Send a license key email to a user via Resend's REST API.
 * Returns true if sent, false if skipped (no API key configured).
 */
export async function sendLicenseKeyEmail(params: {
  to: string;
  userName: string;
  licenseKey: string;
  tier: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not configured — skipping email. Set it in Vercel env vars.');
    return false;
  }

  const tierName = params.tier === 'ultimate' ? 'Ultimate' : params.tier === 'pro' ? 'Pro' : params.tier === 'standard' ? 'Standard' : params.tier;
  const tierPrice = params.tier === 'ultimate' ? '$24.99/mo' : params.tier === 'pro' ? '$14.99/mo' : params.tier === 'standard' ? '$9.99/mo' : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #14161a; font-family: 'Inter', -apple-system, sans-serif; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
    .card { background: impulse-gradient(145deg, #1a1d23, #22262e); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 40px 32px; }
    .header { text-align: center; margin-bottom: 28px; }
    .logo { font-size: 28px; font-weight: 800; color: #e8eaed; letter-spacing: -0.03em; }
    .logo span { color: #c9a84c; }
    .gold-line { width: 60px; height: 2px; background: impulse-gradient(90deg, #c9a84c, #e6d07a); margin: 16px auto; }
    h1 { font-size: 22px; font-weight: 700; color: #e8eaed; text-align: center; margin: 0 0 8px 0; }
    .subtitle { font-size: 14px; color: #858d9c; text-align: center; margin: 0 0 28px 0; }
    .key-box { background: impulse-gradient(145deg, #2a2e36, #1a1d23); border: 1px solid rgba(201,168,76,0.25); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .key-label { font-size: 10px; font-weight: 600; color: #858d9c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    .key-value { font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; color: #e6d07a; letter-spacing: 0.05em; }
    .btn { display: inline-block; padding: 12px 32px; border-radius: 12px; background: impulse-gradient(145deg, #d4b860, #b89840); color: #000; font-size: 14px; font-weight: 700; text-decoration: none; }
    .footer { text-align: center; font-size: 11px; color: #666f80; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">Horizon Tweaks<span>Tweaks</span></div>
        <div class="gold-line"></div>
      </div>
      <h1>Your License Key</h1>
      <p class="subtitle">${tierName} — ${tierPrice}</p>
      <p style="color:#b0b5bf;font-size:14px;line-height:1.6;text-align:center">Your ${tierName} subscription is active.<br/>Here's your unique license key:</p>
      <div class="key-box">
        <div class="key-label">License Key</div>
        <div class="key-value">${params.licenseKey}</div>
      </div>
      <p style="text-align:center;font-size:13px;color:#858d9c;line-height:1.6">
        Visit <strong style="color:#d5d8de">impulse-optimizations.vercel.app/license</strong> to redeem or view your key anytime.
      </p>
      <br/>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Horizon Tweaks</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'arktweaks/1.0',
      },
      body: JSON.stringify({
        from: 'Horizon Tweaks <noreply@arktweaks.com>',
        to: [params.to],
        subject: `Your ${tierName} License Key for Horizon Tweaks`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[email] Resend error:', JSON.stringify(data));
      return false;
    }

    console.log(`[email] License key email sent to ${params.to} (id: ${data.id})`);
    return true;
  } catch (err) {
    console.error('[email] Failed to send:', err);
    return false;
  }
}
