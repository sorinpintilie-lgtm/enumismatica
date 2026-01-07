import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../../lib/apiAuth';
import crypto from 'node:crypto';

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json();
    const codeRaw = String(body?.code || '').trim().toUpperCase();
    if (!codeRaw) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const hash = sha256Hex(codeRaw);
    const ref = adminDb.collection('users').doc(user.uid).collection('backupCodes').doc(hash);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const data = snap.data() as any;
    if (data.usedAt) {
      return NextResponse.json({ error: 'Code already used' }, { status: 400 });
    }

    await ref.update({ usedAt: admin.firestore.FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('backup-codes/verify error:', err);
    return NextResponse.json({ error: 'Failed to verify backup code' }, { status: 500 });
  }
}

