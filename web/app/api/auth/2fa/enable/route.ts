import { NextRequest, NextResponse } from 'next/server';
import * as speakeasy from 'speakeasy';
import admin, { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const secret = String(body?.secret || '').trim().toUpperCase();
    const code = String(body?.code || '').trim();

    if (!secret || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const batch = adminDb.batch();

    // Store secret server-side (not readable by normal users).
    batch.set(
      adminDb.collection('users').doc(user.uid).collection('privateAuth').doc('2fa'),
      {
        totpSecretBase32: secret,
        enabledAt: admin.firestore.FieldValue.serverTimestamp(),
        disabledAt: null,
      },
      { merge: true },
    );

    // Store only the flag on the user document.
    batch.set(
      adminDb.collection('users').doc(user.uid),
      {
        twoFactorEnabled: true,
        // Cleanup old public field if it existed.
        twoFactorSecret: admin.firestore.FieldValue.delete(),
      },
      { merge: true },
    );

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('2fa/enable error:', err);
    return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 });
  }
}

