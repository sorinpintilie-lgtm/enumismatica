import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../lib/apiAuth';
import { requireStepUp } from '../../../lib/stepUp';

async function disableListingsForUser(userId: string) {
  if (!adminDb) return;

  // Disable products
  const productsSnap = await adminDb.collection('products').where('ownerId', '==', userId).get();
  let batch = adminDb.batch();
  let count = 0;
  for (const doc of productsSnap.docs) {
    batch.set(
      doc.ref,
      {
        status: 'disabled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    count++;
    if (count >= 400) {
      await batch.commit();
      batch = adminDb.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();

  // Cancel auctions (best-effort).
  const auctionsSnap = await adminDb.collection('auctions').where('ownerId', '==', userId).get();
  batch = adminDb.batch();
  count = 0;
  for (const doc of auctionsSnap.docs) {
    batch.set(
      doc.ref,
      {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    count++;
    if (count >= 400) {
      await batch.commit();
      batch = adminDb.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    await requireStepUp(req, 'account_deactivate');

    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    await adminDb.collection('users').doc(user.uid).set(
      {
        accountStatus: 'deactivated',
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await disableListingsForUser(user.uid);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('account/deactivate error:', err);
    return NextResponse.json({ error: 'Failed to deactivate account' }, { status: 500 });
  }
}

