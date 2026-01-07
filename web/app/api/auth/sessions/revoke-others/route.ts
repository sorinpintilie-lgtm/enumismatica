import { NextRequest, NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Server is not configured.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const currentSessionId = typeof body?.currentSessionId === 'string' ? body.currentSessionId : null;

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Mark other sessions as revoked.
    const snap = await adminDb
      .collection('userSessions')
      .where('userId', '==', user.uid)
      .get();

    const batch = adminDb.batch();
    let revokedCount = 0;

    snap.docs.forEach((doc) => {
      if (currentSessionId && doc.id === currentSessionId) return;
      const data = doc.data() as any;
      if (data.revokedAt) return;
      batch.update(doc.ref, { revokedAt: now });
      revokedCount++;
    });

    if (revokedCount > 0) {
      await batch.commit();
    }

    // Revoke refresh tokens so other devices are forced to re-authenticate.
    // NOTE: This revokes all refresh tokens for the user; current device may need to re-login once it refreshes.
    await adminAuth.revokeRefreshTokens(user.uid);

    return NextResponse.json({ success: true, revokedCount });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('sessions/revoke-others error:', err);
    return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 });
  }
}

