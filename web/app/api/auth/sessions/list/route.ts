import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      console.warn('Firebase Admin SDK not initialized - cannot list sessions');
      return NextResponse.json({ sessions: [] }, { status: 200 });
    }

    const snap = await adminDb
      .collection('userSessions')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const sessions = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        lastSeenAt: data.lastSeenAt?.toDate?.()?.toISOString?.() || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        deviceLabel: data.deviceLabel || null,
        revokedAt: data.revokedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return NextResponse.json({ sessions });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('sessions/list error:', err);
    return NextResponse.json({ sessions: [] }, { status: 200 });
  }
}

