import { NextRequest, NextResponse } from 'next/server';
import * as speakeasy from 'speakeasy';
import admin, { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';
import crypto from 'node:crypto';

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function get2faSecret(userId: string): Promise<string | null> {
  if (!adminDb) return null;

  const privateSnap = await adminDb
    .collection('users')
    .doc(userId)
    .collection('privateAuth')
    .doc('2fa')
    .get();
  if (privateSnap.exists) {
    const data = privateSnap.data() as any;
    if (typeof data?.totpSecretBase32 === 'string' && data.totpSecretBase32) {
      return data.totpSecretBase32;
    }
  }

  // Back-compat: old public field.
  const userSnap = await adminDb.collection('users').doc(userId).get();
  if (userSnap.exists) {
    const data = userSnap.data() as any;
    if (typeof data?.twoFactorSecret === 'string' && data.twoFactorSecret) {
      // migrate best-effort
      try {
        const batch = adminDb.batch();
        batch.set(
          adminDb.collection('users').doc(userId).collection('privateAuth').doc('2fa'),
          {
            totpSecretBase32: data.twoFactorSecret,
            migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        batch.set(
          adminDb.collection('users').doc(userId),
          {
            twoFactorSecret: admin.firestore.FieldValue.delete(),
          },
          { merge: true },
        );
        await batch.commit();
      } catch (e) {
        console.warn('[2fa/verify-login] failed to migrate secret (non-fatal):', e);
      }
      return data.twoFactorSecret;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const method = body?.method === 'backup' ? 'backup' : 'totp';
    const code = String(body?.code || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    if (method === 'backup') {
      const hash = sha256Hex(code);
      const ref = adminDb.collection('users').doc(user.uid).collection('backupCodes').doc(hash);
      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      }
      const data = snap.data() as any;
      if (data.usedAt) {
        return NextResponse.json({ error: 'Code already used' }, { status: 400 });
      }
      await ref.set({ usedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return NextResponse.json({ success: true });
    }

    const secret = await get2faSecret(user.uid);
    if (!secret) {
      return NextResponse.json({ error: '2FA is not configured' }, { status: 400 });
    }

    const ok = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });
    if (!ok) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('2fa/verify-login error:', err);
    return NextResponse.json({ error: 'Failed to verify 2FA code' }, { status: 500 });
  }
}

