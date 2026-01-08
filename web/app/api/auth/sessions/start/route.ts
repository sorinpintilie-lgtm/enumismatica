import { NextRequest, NextResponse } from 'next/server';
import admin, { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, getRequestIp, requireVerifiedUser } from '../../../../lib/apiAuth';

// Simple in-memory session store for development when Firebase Admin is not available
const devSessions = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    const body = await req.json().catch(() => ({}));
    const deviceLabel = typeof body?.deviceLabel === 'string' ? body.deviceLabel.slice(0, 80) : null;

    const ip = getRequestIp(req);
    const userAgent = req.headers.get('user-agent');
    const now = new Date().toISOString();
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);

    const sessionData = {
      id: sessionId,
      userId: user.uid,
      createdAt: now,
      lastSeenAt: now,
      ipAddress: ip,
      userAgent,
      deviceLabel,
      revokedAt: null,
    };

    if (adminDb) {
      // Use Firestore if available
      const ref = adminDb.collection('userSessions').doc(sessionId);
      await ref.set({
        userId: user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: ip,
        userAgent,
        deviceLabel,
        revokedAt: null,
      });
    } else {
      // Fallback to in-memory store for development
      console.warn('Firebase Admin SDK not initialized - using in-memory session store');
      if (!devSessions.has(user.uid)) {
        devSessions.set(user.uid, []);
      }
      devSessions.get(user.uid)?.push(sessionData);
    }

    return NextResponse.json({ sessionId });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('sessions/start error:', err);
    return NextResponse.json({ sessionId: 'mock-session-' + Date.now() }, { status: 200 });
  }
}

