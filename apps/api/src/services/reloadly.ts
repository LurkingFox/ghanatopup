import crypto from 'crypto';

const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID || '';
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET || '';
const RELOADLY_ENV = process.env.RELOADLY_ENV || 'sandbox';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchJson(url: string, opts: any = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Reloadly fetch failed: ${res.status}`);
  return res.json();
}

export async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) return cachedToken.token;
  const base = RELOADLY_ENV === 'production' ? 'https://auth.reloadly.com' : 'https://sandbox-auth.reloadly.com';
  const url = `${base}/oauth/token`;
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: RELOADLY_CLIENT_ID, client_secret: RELOADLY_CLIENT_SECRET });
  const json = await fetchJson(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const token = json.access_token;
  const expiresIn = json.expires_in || 3600;
  cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

export async function getBundles(operatorId: string) {
  const token = await getAccessToken();
  const base = RELOADLY_ENV === 'production' ? 'https://topups.reloadly.com' : 'https://sandbox.topups.reloadly.com';
  const url = `${base}/operators/${operatorId}/bundles`;
  return fetchJson(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/com.reloadly.topups-v1+json' } });
}

export async function topupBundle(operatorId: string, bundleId: string, recipientPhone: string, senderPhone?: string) {
  const token = await getAccessToken();
  const base = RELOADLY_ENV === 'production' ? 'https://topups.reloadly.com' : 'https://sandbox.topups.reloadly.com';
  const url = `${base}/topups/bundles`;
  const body = { operatorId, bundleId, recipientPhone, senderPhone };
  return fetchJson(url, { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
}

export function verifyReloadlyWebhook(body: string, signature: string, key = process.env.WEBHOOK_SECRET || '') {
  if (!key) return false;
  const hmac = crypto.createHmac('sha256', key).update(body).digest('hex');
  return hmac === signature;
}
