import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, getRequestIp, requireVerifiedUser } from '../../../../lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const deviceLabel = typeof body?.deviceLabel === 'string' ? body.deviceLabel.slice(0, 80) : null;

    const ip = getRequestIp(req);
    const userAgent = req.headers.get('user-agent');

    const ref = adminDb.collection('userSessions').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await ref.set({
      userId: user.uid,
      createdAt: now,
      lastSeenAt: now,
      ipAddress: ip,
      userAgent,
      deviceLabel,
      revokedAt: null,
    });

    return NextResponse.json({ sessionId: ref.id });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('sessions/start error:', err);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}

