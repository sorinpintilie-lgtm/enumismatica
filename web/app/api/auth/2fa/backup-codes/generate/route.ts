import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../../lib/apiAuth';
import crypto from 'node:crypto';

function generateCode(): string {
  // Format: XXXX-XXXX
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${bytes.slice(0, 4)}-${bytes.slice(4, 8)}`;
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    // Generate 10 one-time backup codes.
    const codes = Array.from({ length: 10 }, () => generateCode());
    const now = admin.firestore.FieldValue.serverTimestamp();

    const batch = adminDb.batch();
    const sub = adminDb.collection('users').doc(user.uid).collection('backupCodes');

    // Overwrite existing backup codes set (regenerate).
    const existing = await sub.get();
    existing.docs.forEach((d) => batch.delete(d.ref));

    for (const code of codes) {
      const hash = sha256Hex(code);
      const ref = sub.doc(hash);
      batch.set(ref, {
        hash,
        createdAt: now,
        usedAt: null,
      });
    }

    // Also store metadata on user doc.
    batch.set(
      adminDb.collection('users').doc(user.uid),
      { backupCodesGeneratedAt: now },
      { merge: true },
    );

    await batch.commit();

    return NextResponse.json({ codes });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('backup-codes/generate error:', err);
    return NextResponse.json({ error: 'Failed to generate backup codes' }, { status: 500 });
  }
}

