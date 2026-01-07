import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../lib/apiAuth';
import { requireStepUp } from '../../../lib/stepUp';

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
    await requireStepUp(req, 'account_export');
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    // Optional selection: /api/account/export?include=profile,products,auctions,orders,conversations,sessions,collection,watchlist
    // Default: everything.
    const includeParam = req.nextUrl.searchParams.get('include');
    const requested = includeParam
      ? includeParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
    const wants = (key: string) => !requested || requested.includes(key);

    const userDoc = await adminDb.collection('users').doc(user.uid).get();
    const userProfile = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;

    const [products, auctions, ordersAsBuyer, ordersAsSeller, conversations, sessions, collectionItems, watchlistItems] =
      await Promise.all([
        wants('products')
          ? safeQuery(adminDb.collection('products').where('ownerId', '==', user.uid).get())
          : Promise.resolve([]),
        wants('auctions')
          ? safeQuery(adminDb.collection('auctions').where('ownerId', '==', user.uid).get())
          : Promise.resolve([]),
        wants('orders')
          ? safeQuery(adminDb.collection('orders').where('buyerId', '==', user.uid).get())
          : Promise.resolve([]),
        wants('orders')
          ? safeQuery(adminDb.collection('orders').where('sellerId', '==', user.uid).get())
          : Promise.resolve([]),
        wants('conversations')
          ? // Conversations: if participants is an array
            safeQuery(adminDb.collection('conversations').where('participants', 'array-contains', user.uid).get())
          : Promise.resolve([]),
        wants('sessions')
          ? safeQuery(adminDb.collection('userSessions').where('userId', '==', user.uid).get())
          : Promise.resolve([]),
        wants('collection')
          ? safeQuery(adminDb.collection('users').doc(user.uid).collection('collection').get())
          : Promise.resolve([]),
        wants('watchlist')
          ? safeQuery(adminDb.collection('users').doc(user.uid).collection('watchlist').get())
          : Promise.resolve([]),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        uid: user.uid,
        email: user.email || null,
      },
      profile: wants('profile') ? userProfile : null,
      products: wants('products') ? products : [],
      auctions: wants('auctions') ? auctions : [],
      orders: wants('orders')
        ? {
            asBuyer: ordersAsBuyer,
            asSeller: ordersAsSeller,
          }
        : { asBuyer: [], asSeller: [] },
      conversations: wants('conversations') ? conversations : [],
      sessions: wants('sessions') ? sessions : [],
      collection: wants('collection') ? collectionItems : [],
      watchlist: wants('watchlist') ? watchlistItems : [],
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

