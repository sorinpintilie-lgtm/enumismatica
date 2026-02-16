import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebaseAdmin';
import {
  isSuccessfulNetopiaStatus,
  verifyNetopiaWebhookSignature,
} from '../../../../lib/netopia';

const CREDIT_PRICE_RON = 1;

function calculateCreditsFromRON(ronAmount: number): number {
  if (!Number.isFinite(ronAmount) || ronAmount <= 0) return 0;
  return Math.floor(ronAmount / CREDIT_PRICE_RON);
}

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-netopia-signature');

    if (!verifyNetopiaWebhookSignature(rawBody, signatureHeader)) {
      return NextResponse.json({ error: 'Invalid NETOPIA webhook signature.' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const orderId =
      payload?.order?.orderID ||
      payload?.order?.ntpID ||
      payload?.orderId ||
      payload?.ntpID ||
      null;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing order identifier.' }, { status: 400 });
    }

    const statusRaw =
      payload?.order?.status ||
      payload?.status ||
      payload?.payment?.status ||
      'pending';

    const amountRaw =
      payload?.order?.amount ||
      payload?.amount ||
      payload?.payment?.amount ||
      0;

    const ronAmount = Number(amountRaw);

    const purchaseRef = adminDb.collection('creditPurchases').doc(orderId);

    await adminDb.runTransaction(async (tx) => {
      const purchaseSnap = await tx.get(purchaseRef);
      if (!purchaseSnap.exists) {
        throw new Error('Purchase order not found');
      }

      const purchase = purchaseSnap.data() as any;
      const effectiveAmount = Number.isFinite(ronAmount) && ronAmount > 0 ? ronAmount : Number(purchase.amountRON || 0);

      tx.set(
        purchaseRef,
        {
          netopiaStatus: String(statusRaw || ''),
          netopiaPayload: payload,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      if (!isSuccessfulNetopiaStatus(statusRaw)) {
        tx.set(
          purchaseRef,
          {
            status: 'failed_or_pending',
            updatedAt: new Date(),
          },
          { merge: true },
        );
        return;
      }

      if (purchase.creditsApplied) {
        tx.set(
          purchaseRef,
          {
            status: 'paid_confirmed',
            updatedAt: new Date(),
          },
          { merge: true },
        );
        return;
      }

      const userId = purchase.userId as string | undefined;
      if (!userId) {
        throw new Error('Purchase is missing userId');
      }

      const targetUserRef = adminDb.collection('users').doc(userId);
      const userSnap = await tx.get(targetUserRef);
      if (!userSnap.exists) {
        throw new Error('User profile not found');
      }

      const userData = userSnap.data() as any;
      const currentCredits = typeof userData.credits === 'number' ? userData.credits : 0;
      const creditsToAdd = calculateCreditsFromRON(effectiveAmount);
      const nextCredits = currentCredits + creditsToAdd;

      tx.set(
        targetUserRef,
        {
          credits: nextCredits,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      const txRef = targetUserRef.collection('creditTransactions').doc();
      tx.set(txRef, {
        userId,
        type: 'purchase_netopia',
        provider: 'netopia',
        paymentReference: orderId,
        ronAmount: effectiveAmount,
        amount: creditsToAdd,
        createdAt: new Date(),
      });

      tx.set(
        purchaseRef,
        {
          status: 'paid_confirmed',
          creditsApplied: true,
          creditedAmount: creditsToAdd,
          updatedAt: new Date(),
        },
        { merge: true },
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('payments/netopia/webhook error:', err);
    return NextResponse.json({ error: err?.message || 'Webhook processing failed.' }, { status: 500 });
  }
}

