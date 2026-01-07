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

    if (order.sellerId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!order.shippingAddressShared || !order.shippingAddressSnapshot) {
      return NextResponse.json({ error: 'Shipping address not shared yet' }, { status: 404 });
    }

    return NextResponse.json({
      sharedAt: order.shippingAddressSharedAt?.toDate?.()?.toISOString?.() || null,
      shippingAddress: order.shippingAddressSnapshot,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('orders/shipping-address error:', err);
    return NextResponse.json({ error: 'Failed to fetch shipping address' }, { status: 500 });
  }
}

