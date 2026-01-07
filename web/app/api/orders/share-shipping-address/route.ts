import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId || '').trim();
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = orderSnap.data() as any;
    if (order.buyerId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userSnap = await adminDb.collection('users').doc(user.uid).get();
    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const pd = (userData.personalDetails || {}) as any;

    const snapshot = {
      firstName: pd.firstName || null,
      lastName: pd.lastName || null,
      phone: pd.phone || null,
      address: pd.address || null,
      county: pd.county || null,
      postalCode: pd.postalCode || null,
      country: pd.country || null,
    };

    await orderRef.set(
      {
        shippingAddressShared: true,
        shippingAddressSharedAt: admin.firestore.FieldValue.serverTimestamp(),
        shippingAddressSnapshot: snapshot,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('orders/share-shipping-address error:', err);
    return NextResponse.json({ error: 'Failed to share shipping address' }, { status: 500 });
  }
}

