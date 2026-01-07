import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../lib/apiAuth';

async function safeQuery(q: Promise<FirebaseFirestore.QuerySnapshot>): Promise<any[]> {
  try {
    const snap = await q;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Export query failed (non-fatal):', e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const userDoc = await adminDb.collection('users').doc(user.uid).get();
    const userProfile = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;

    const [
      products,
      auctions,
      ordersAsBuyer,
      ordersAsSeller,
      conversations,
      sessions,
      collectionItems,
      watchlistItems,
    ] = await Promise.all([
      safeQuery(adminDb.collection('products').where('ownerId', '==', user.uid).get()),
      safeQuery(adminDb.collection('auctions').where('ownerId', '==', user.uid).get()),
      safeQuery(adminDb.collection('orders').where('buyerId', '==', user.uid).get()),
      safeQuery(adminDb.collection('orders').where('sellerId', '==', user.uid).get()),
      // Conversations: if participants is an array
      safeQuery(adminDb.collection('conversations').where('participants', 'array-contains', user.uid).get()),
      safeQuery(adminDb.collection('userSessions').where('userId', '==', user.uid).get()),
      safeQuery(adminDb.collection('users').doc(user.uid).collection('collection').get()),
      safeQuery(adminDb.collection('users').doc(user.uid).collection('watchlist').get()),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        uid: user.uid,
        email: user.email || null,
      },
      profile: userProfile,
      products,
      auctions,
      orders: {
        asBuyer: ordersAsBuyer,
        asSeller: ordersAsSeller,
      },
      conversations,
      sessions,
      collection: collectionItems,
      watchlist: watchlistItems,
    };

    const json = JSON.stringify(payload, null, 2);
    const filename = `enumismatica_export_${user.uid}_${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('export error:', err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

