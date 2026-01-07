import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../lib/apiAuth';
import { requireStepUp } from '../../../lib/stepUp';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    await requireStepUp(req, 'account_reactivate');

    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    await adminDb.collection('users').doc(user.uid).set(
      {
        accountStatus: 'active',
        reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('account/reactivate error:', err);
    return NextResponse.json({ error: 'Failed to reactivate account' }, { status: 500 });
  }
}

