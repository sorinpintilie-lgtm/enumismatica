import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../../lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json();
    const deviceId = String(body?.deviceId || '').trim();
    const label = typeof body?.label === 'string' ? body.label.slice(0, 80) : null;
    const days = Number(body?.days || 30);
    const expiresMs = Date.now() + Math.max(1, Math.min(days, 90)) * 24 * 60 * 60 * 1000;

    if (!deviceId || deviceId.length < 16) {
      return NextResponse.json({ error: 'Invalid deviceId' }, { status: 400 });
    }

    const ref = adminDb.collection('users').doc(user.uid).collection('trustedDevices').doc(deviceId);
    await ref.set(
      {
        deviceId,
        label,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(expiresMs),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('trusted-devices/add error:', err);
    return NextResponse.json({ error: 'Failed to add trusted device' }, { status: 500 });
  }
}

