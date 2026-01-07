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
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const ref = adminDb.collection('userSessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const data = snap.data() as any;
    if (data.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const ip = getRequestIp(req);
    const userAgent = req.headers.get('user-agent');

    await ref.update({
      lastSeenAt: now,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('sessions/ping error:', err);
    return NextResponse.json({ error: 'Failed to ping session' }, { status: 500 });
  }
}

