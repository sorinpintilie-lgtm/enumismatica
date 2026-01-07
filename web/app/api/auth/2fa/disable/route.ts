import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';
import { requireStepUp } from '../../../../lib/stepUp';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    await requireStepUp(req, '2fa_disable');

    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const batch = adminDb.batch();
    batch.set(
      adminDb.collection('users').doc(user.uid),
      {
        twoFactorEnabled: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      adminDb.collection('users').doc(user.uid).collection('privateAuth').doc('2fa'),
      {
        totpSecretBase32: admin.firestore.FieldValue.delete(),
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('2fa/disable error:', err);
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
  }
}

