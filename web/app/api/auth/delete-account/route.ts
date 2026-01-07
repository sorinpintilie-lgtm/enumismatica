import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../lib/apiAuth';
import { requireStepUp } from '../../../lib/stepUp';

export async function POST(request: NextRequest) {
  try {
    const caller = await requireVerifiedUser(request);
    await requireStepUp(request, 'account_delete');
    const body = await request.json().catch(() => ({}));
    const requestedUserId = typeof body?.userId === 'string' ? body.userId : null;
    const targetUserId = requestedUserId && requestedUserId !== caller.uid ? requestedUserId : caller.uid;

    // Check if Firebase Admin is initialized
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Non-admin users can only delete their own account.
    if (targetUserId !== caller.uid) {
      const callerDoc = await adminDb.collection('users').doc(caller.uid).get();
      const role = (callerDoc.exists ? (callerDoc.data() as any)?.role : null) || 'user';
      const isAdmin = role === 'admin' || role === 'superadmin';
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete user data from Firestore
    const batch = adminDb.batch();

    // Delete user document
    const userRef = adminDb.collection('users').doc(targetUserId);
    batch.delete(userRef);

    // Delete user's products
    const productsSnapshot = await adminDb
      .collection('products')
      .where('ownerId', '==', targetUserId)
      .get();
    
    productsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's auctions
    const auctionsSnapshot = await adminDb
      .collection('auctions')
      .where('ownerId', '==', targetUserId)
      .get();
    
    auctionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's messages
    const messagesSnapshot = await adminDb
      .collection('messages')
      .where('senderId', '==', targetUserId)
      .get();
    
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's collection items
    const collectionSnapshot = await adminDb
      .collection('collections')
      .where('userId', '==', targetUserId)
      .get();
    
    collectionSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit the batch
    await batch.commit();

    // Delete user from Firebase Auth
    await adminAuth.deleteUser(targetUserId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
