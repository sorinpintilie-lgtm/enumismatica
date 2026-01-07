import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../lib/apiAuth';

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

    const orderSnap = await adminDb.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = orderSnap.data() as any;

    if (order.buyerId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sellerId = String(order.sellerId || '');
    if (!sellerId || sellerId === 'monetaria-statului') {
      return NextResponse.json({ error: 'No seller banking details available' }, { status: 404 });
    }

    const sellerSnap = await adminDb.collection('users').doc(sellerId).get();
    if (!sellerSnap.exists) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }
    const seller = sellerSnap.data() as any;
    const pd = (seller.personalDetails || {}) as any;

    const bankAccount = typeof pd.bankAccount === 'string' ? pd.bankAccount : null;
    const firstName = typeof pd.firstName === 'string' ? pd.firstName : null;
    const lastName = typeof pd.lastName === 'string' ? pd.lastName : null;

    if (!bankAccount) {
      return NextResponse.json({ error: 'Seller has no bank account set' }, { status: 404 });
    }

    return NextResponse.json({
      bankAccount,
      accountName: firstName && lastName ? `${firstName} ${lastName}` : null,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('orders/banking-details error:', err);
    return NextResponse.json({ error: 'Failed to fetch banking details' }, { status: 500 });
  }
}

