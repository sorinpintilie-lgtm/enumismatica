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
      netopiaOrderId: orderId,
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
        ntpID: orderId,
        posSignature: signature,
        dateTime: new Date().toISOString(),
        description: `Achiziție credite eNumismatica (${roundedAmount} RON)`,
        orderID: orderId,
        amount: roundedAmount,
        currency: 'RON',
        billing: {
          email: user.email || `user-${user.uid}@enumismatica.local`,
        },
      },
    };

    const netopiaRes = await fetch(`${baseUrl}/payment/card/start`, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const netopiaText = await netopiaRes.text();
    let netopiaData: any = null;
    try {
      netopiaData = JSON.parse(netopiaText);
    } catch {
      netopiaData = { raw: netopiaText };
    }

    if (!netopiaRes.ok) {
      await adminDb.collection('creditPurchases').doc(orderId).set(
        {
          status: 'failed_to_create',
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

    const paymentUrl =
      netopiaData?.paymentUrl ||
      netopiaData?.paymentURL ||
      netopiaData?.data?.paymentUrl ||
      netopiaData?.data?.paymentURL ||
      null;

    await adminDb.collection('creditPurchases').doc(orderId).set(
      {
        status: 'pending_payment',
        paymentUrl,
        netopiaPayload: netopiaData,
        updatedAt: new Date(),
      },
      { merge: true },
    );

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

