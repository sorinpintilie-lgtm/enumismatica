import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin is initialized
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Delete user data from Firestore
    const batch = adminDb.batch();

    // Delete user document
    const userRef = adminDb.collection('users').doc(userId);
    batch.delete(userRef);

    // Delete user's products
    const productsSnapshot = await adminDb
      .collection('products')
      .where('ownerId', '==', userId)
      .get();
    
    productsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's auctions
    const auctionsSnapshot = await adminDb
      .collection('auctions')
      .where('ownerId', '==', userId)
      .get();
    
    auctionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's messages
    const messagesSnapshot = await adminDb
      .collection('messages')
      .where('senderId', '==', userId)
      .get();
    
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's collection items
    const collectionSnapshot = await adminDb
      .collection('collections')
      .where('userId', '==', userId)
      .get();
    
    collectionSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit the batch
    await batch.commit();

    // Delete user from Firebase Auth
    await adminAuth.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
