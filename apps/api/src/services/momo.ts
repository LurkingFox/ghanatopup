import crypto from 'crypto';

const MTN_MOMO_SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
const MTN_MOMO_API_USER = process.env.MTN_MOMO_API_USER || '';
const MTN_MOMO_API_KEY = process.env.MTN_MOMO_API_KEY || '';
const MTN_MOMO_ENV = process.env.MTN_MOMO_ENV || 'sandbox';

async function fetchJson(url: string, opts: any = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`MoMo fetch failed: ${res.status}`);
  return res.json();
}

export async function requestPayment(amount: string, currency: string, externalId: string, payer: { partyIdType: string; partyId: string }) {
  // This is a lightweight helper that POSTs to MTN's requesttopay endpoint.
  const base = MTN_MOMO_ENV === 'production' ? 'https://api.mtn.com' : 'https://sandbox.momodeveloper.mtn.com';
  const tokenUrl = `${base}/collection/token/`;

  // NOTE: MTN uses Basic auth with api user and api key to obtain an access token
  const auth = Buffer.from(`${MTN_MOMO_API_USER}:${MTN_MOMO_API_KEY}`).toString('base64');
  const tokenResp = await fetchJson(tokenUrl, { method: 'POST', headers: { Authorization: `Basic ${auth}` } });
  const accessToken = tokenResp.access_token;

  const reqUrl = `${base}/collection/v1_0/requesttopay`;
  const body = { amount, currency, externalId, payer };
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Callback-Url': process.env.MTN_CALLBACK_URL || '',
    'Ocp-Apim-Subscription-Key': MTN_MOMO_SUBSCRIPTION_KEY,
    'Content-Type': 'application/json'
  } as Record<string,string>;

  return fetchJson(reqUrl, { method: 'POST', headers, body: JSON.stringify(body) });
}

export function verifyMomoWebhook(body: string, signatureHeader: string | undefined, key = process.env.WEBHOOK_SECRET || '') {
  // MTN's real signature scheme differs; this placeholder uses HMAC-SHA256
  if (!key || !signatureHeader) return false;
  const expected = crypto.createHmac('sha256', key).update(body).digest('hex');
  return expected === signatureHeader;
}
