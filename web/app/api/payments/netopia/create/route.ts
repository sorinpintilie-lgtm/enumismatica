import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';
import {
  getNetopiaApiKey,
  getNetopiaBaseUrl,
  getNetopiaSignature,
} from '../../../../lib/netopia';

const MIN_RON = 2;
const MAX_RON = 5000;

type NetopiaCallResult = {
  ok: boolean;
  status: number;
  data: any;
  endpoint: string;
};

async function callNetopiaStart(
  apiKey: string,
  baseUrl: string,
  payload: any,
): Promise<NetopiaCallResult> {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/payment/card/start`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    endpoint,
  };
}

async function startNetopiaPayment(
  configuredBaseUrl: string,
  apiKey: string,
  payload: any,
): Promise<NetopiaCallResult> {
  const candidates = Array.from(
    new Set([
      configuredBaseUrl,
      'https://secure.sandbox.netopia-payments.com',
      'https://secure-sandbox.netopia-payments.com',
      'https://secure.netopia-payments.com',
    ]),
  );

  let last: NetopiaCallResult | null = null;

  for (const candidate of candidates) {
    const result = await callNetopiaStart(apiKey, candidate, payload);
    last = result;

    const rawHtml = String(result?.data?.raw || '');
    const looksLikeMarketingHtml =
      rawHtml.includes('<!DOCTYPE html') && rawHtml.includes('netopia-payments.com');

    if (!looksLikeMarketingHtml) {
      return result;
    }
  }

  return last || { ok: false, status: 500, data: { error: 'No NETOPIA response' }, endpoint: configuredBaseUrl };
}

function extractPaymentUrl(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const directCandidates = [
    payload?.paymentUrl,
    payload?.paymentURL,
    payload?.payment_url,
    payload?.redirectUrl,
    payload?.redirectURL,
    payload?.redirect_url,
    payload?.url,
    payload?.data?.paymentUrl,
    payload?.data?.paymentURL,
    payload?.data?.payment_url,
    payload?.data?.redirectUrl,
    payload?.data?.redirect_url,
    payload?.data?.url,
    payload?.payment?.url,
    payload?.payment?.paymentUrl,
    payload?.payment?.paymentURL,
    payload?.result?.paymentUrl,
    payload?.result?.url,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }

  const visited = new Set<any>();
  const stack: any[] = [payload];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    for (const value of Object.values(current)) {
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value;
      }
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const ronAmount = Number(body?.ronAmount);

    if (!Number.isFinite(ronAmount) || ronAmount < MIN_RON || ronAmount > MAX_RON) {
      return NextResponse.json(
        { error: `Invalid amount. Amount must be between ${MIN_RON} and ${MAX_RON} RON.` },
        { status: 400 },
      );
    }

    const roundedAmount = Math.floor(ronAmount * 100) / 100;
    const orderId = randomUUID();
    const netopiaOrderId = randomUUID().replace(/-/g, '');

    const origin = req.nextUrl.origin;
    const baseUrl = getNetopiaBaseUrl();
    const apiKey = getNetopiaApiKey();
    const signature = getNetopiaSignature();

    const orderDoc = {
      userId: user.uid,
      userEmail: user.email || null,
      provider: 'netopia',
      amountRON: roundedAmount,
      currency: 'RON',
      status: 'initiated',
      creditsApplied: false,
      netopiaOrderId,
      paymentUrl: null as string | null,
      netopiaStatus: null as string | null,
      netopiaPayload: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('creditPurchases').doc(orderId).set(orderDoc);

    const payload = {
      config: {
        emailTemplate: '',
        emailSubject: 'Plată credite eNumismatica',
        notifyUrl: `${origin}/api/payments/netopia/webhook`,
        redirectUrl: `${origin}/credits/success?orderId=${encodeURIComponent(orderId)}`,
        language: 'ro',
      },
      payment: {
        options: {
          installments: 0,
          bonus: 0,
        },
        instrument: {
          type: 'card',
        },
        data: {
          property1: 'credits_topup',
          property2: user.uid,
        },
      },
      order: {
        posSignature: signature,
        dateTime: new Date().toISOString(),
        description: `Achiziție credite eNumismatica (${roundedAmount} RON)`,
        orderID: netopiaOrderId,
        amount: roundedAmount,
        currency: 'RON',
        billing: {
          email: user.email || `user-${user.uid}@enumismatica.local`,
        },
      },
    };

    const netopiaResult = await startNetopiaPayment(baseUrl, apiKey, payload);
    const netopiaData: any = netopiaResult.data;

    if (!netopiaResult.ok) {
      await adminDb.collection('creditPurchases').doc(orderId).set(
        {
          status: 'failed_to_create',
          netopiaEndpoint: netopiaResult.endpoint,
          netopiaHttpStatus: netopiaResult.status,
          netopiaPayload: netopiaData,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      return NextResponse.json(
        { error: 'Failed to initiate NETOPIA payment.', details: netopiaData },
        { status: 502 },
      );
    }

    const paymentUrl = extractPaymentUrl(netopiaData);

    await adminDb.collection('creditPurchases').doc(orderId).set(
      {
        status: 'pending_payment',
        paymentUrl,
        netopiaEndpoint: netopiaResult.endpoint,
        netopiaHttpStatus: netopiaResult.status,
        netopiaPayload: netopiaData,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    if (!paymentUrl) {
      await adminDb.collection('creditPurchases').doc(orderId).set(
        {
          status: 'missing_payment_url',
          updatedAt: new Date(),
        },
        { merge: true },
      );

      return NextResponse.json(
        {
          error: 'NETOPIA did not return a payment URL.',
          orderId,
          raw: netopiaData,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      orderId,
      paymentUrl,
      raw: netopiaData,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('payments/netopia/create error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to initiate payment.' }, { status: 500 });
  }
}

