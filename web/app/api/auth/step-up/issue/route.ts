import { NextRequest, NextResponse } from 'next/server';
import * as speakeasy from 'speakeasy';
import admin, { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireDecodedIdToken } from '../../../../lib/apiAuth';
import { issueStepUpToken, type StepUpAction } from '../../../../lib/stepUp';
import crypto from 'node:crypto';

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function get2faSecret(userId: string): Promise<string | null> {
  if (!adminDb) return null;

  // Preferred: private subcollection.
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

  // Back-compat: old field on the user doc.
  const userSnap = await adminDb.collection('users').doc(userId).get();
  if (userSnap.exists) {
    const data = userSnap.data() as any;
    if (typeof data?.twoFactorSecret === 'string' && data.twoFactorSecret) {
      // Opportunistic migration: copy to private doc and remove from public doc.
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
        console.warn('[step-up] Failed to migrate 2FA secret (non-fatal):', e);
      }
      return data.twoFactorSecret;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const decoded = await requireDecodedIdToken(req);
    const userId = decoded.uid as string;

    const body = await req.json().catch(() => ({}));
    const method = body?.method === 'backup' ? 'backup' : 'totp';
    const code = String(body?.code || '').trim().toUpperCase();
    const actions = (Array.isArray(body?.actions) ? body.actions : []) as StepUpAction[];
    const uniqueActions = Array.from(new Set(actions)).filter(Boolean);

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }
    if (uniqueActions.length === 0) {
      return NextResponse.json({ error: 'Missing actions' }, { status: 400 });
    }

    // Enforce recent login via ID token auth_time (reauth should refresh it).
    const authTimeSec = Number(decoded?.auth_time || 0);
    const ageSec = Math.floor(Date.now() / 1000) - authTimeSec;
    if (!authTimeSec || ageSec > 5 * 60) {
      return NextResponse.json(
        { error: 'Requires recent login. Please reauthenticate and try again.' },
        { status: 403 },
      );
    }

    // Verify 2FA.
    if (method === 'backup') {
      const hash = sha256Hex(code);
      const ref = adminDb.collection('users').doc(userId).collection('backupCodes').doc(hash);
      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ error: 'Invalid backup code' }, { status: 400 });
      }
      const data = snap.data() as any;
      if (data.usedAt) {
        return NextResponse.json({ error: 'Backup code already used' }, { status: 400 });
      }
      await ref.set({ usedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } else {
      const secret = await get2faSecret(userId);
      if (!secret) {
        return NextResponse.json({ error: '2FA is not configured for this account' }, { status: 400 });
      }
      const ok = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
      if (!ok) {
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
      }
    }

    const tokenId = await issueStepUpToken(userId, uniqueActions);
    return NextResponse.json({ success: true, stepUpToken: tokenId });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('step-up/issue error:', err);
    return NextResponse.json({ error: 'Failed to perform step-up verification' }, { status: 500 });
  }
}

