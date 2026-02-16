import crypto from 'crypto';

export type NetopiaOrderStatus = 'paid' | 'confirmed' | 'authorized' | 'pending' | 'canceled' | 'failed';

export function getNetopiaBaseUrl(): string {
  return process.env.NETOPIA_BASE_URL || 'https://secure.netopia-payments.com';
}

export function getNetopiaApiKey(): string {
  const apiKey = process.env.NETOPIA_API_KEY;
  if (!apiKey) {
    throw new Error('Missing NETOPIA_API_KEY');
  }
  return apiKey;
}

export function getNetopiaSignature(): string {
  const signature = process.env.NETOPIA_SIGNATURE;
  if (!signature) {
    throw new Error('Missing NETOPIA_SIGNATURE');
  }
  return signature;
}

export function getNetopiaWebhookSecret(): string {
  const secret = process.env.NETOPIA_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing NETOPIA_WEBHOOK_SECRET');
  }
  return secret;
}

export function normalizeNetopiaStatus(raw: unknown): NetopiaOrderStatus {
  const value = String(raw || '').toLowerCase();
  if (value.includes('paid')) return 'paid';
  if (value.includes('confirm')) return 'confirmed';
  if (value.includes('auth')) return 'authorized';
  if (value.includes('cancel')) return 'canceled';
  if (value.includes('fail') || value.includes('error')) return 'failed';
  return 'pending';
}

export function isSuccessfulNetopiaStatus(raw: unknown): boolean {
  const normalized = normalizeNetopiaStatus(raw);
  return normalized === 'paid' || normalized === 'confirmed' || normalized === 'authorized';
}

export function verifyNetopiaWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const secret = getNetopiaWebhookSecret();
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const cleanHeader = signatureHeader.trim().toLowerCase();
  const cleanExpected = expected.trim().toLowerCase();

  const a = Buffer.from(cleanHeader, 'utf8');
  const b = Buffer.from(cleanExpected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

