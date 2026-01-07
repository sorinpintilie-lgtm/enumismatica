import { NextRequest, NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '../../../../lib/firebaseAdmin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://enumismatica.ro';

export async function GET(req: NextRequest) {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Server auth/db is not configured.' }, { status: 503 });
    }

    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const ref = adminDb.collection('emailChangeRequests').doc(token);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    const data = snap.data() as any;
    if (data.usedAt) {
      return NextResponse.redirect(`${SITE_URL}/settings?emailChanged=0&reason=used`);
    }

    const expiresAt = data.expiresAt?.toDate?.() ? data.expiresAt.toDate() : null;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      return NextResponse.redirect(`${SITE_URL}/settings?emailChanged=0&reason=expired`);
    }

    const userId = String(data.userId || '');
    const newEmail = String(data.newEmail || '').trim().toLowerCase();
    if (!userId || !newEmail) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Update Auth email.
    await adminAuth.updateUser(userId, {
      email: newEmail,
      emailVerified: false,
    });

    // Update Firestore (best-effort; app primarily uses Firebase Auth email).
    await adminDb
      .collection('users')
      .doc(userId)
      .set({ email: newEmail, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
      .catch(() => null);

    await ref.set({ usedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.redirect(`${SITE_URL}/settings?emailChanged=1`);
  } catch (err: any) {
    console.error('email-change/confirm error:', err);
    return NextResponse.redirect(`${SITE_URL}/settings?emailChanged=0&reason=error`);
  }
}

