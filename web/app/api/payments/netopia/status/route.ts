import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const orderId = req.nextUrl.searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const snap = await adminDb.collection('creditPurchases').doc(orderId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const data = snap.data() as any;
    if (data.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      orderId,
      status: data.status || 'unknown',
      creditsApplied: !!data.creditsApplied,
      creditedAmount: Number(data.creditedAmount || 0),
      amountRON: Number(data.amountRON || 0),
      netopiaStatus: data.netopiaStatus || null,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('payments/netopia/status error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch payment status.' }, { status: 500 });
  }
}

