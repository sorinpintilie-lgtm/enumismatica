import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';

// Simple in-memory session store for development when Firebase Admin is not available
const devSessions = new Map<string, any>();

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    
    if (adminDb) {
      // Use Firestore if available
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
    } else {
      // Fallback to in-memory store for development
      console.warn('Firebase Admin SDK not initialized - using in-memory session store');
      const userSessions = devSessions.get(user.uid) || [];
      
      // Filter out revoked sessions and sort by createdAt
      const sessions = userSessions
        .filter((s: any) => !s.revokedAt)
        .sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 50)
        .map((s: any) => ({
          id: s.id,
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          deviceLabel: s.deviceLabel,
          revokedAt: s.revokedAt,
        }));

      return NextResponse.json({ sessions });
    }
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('sessions/list error:', err);
    return NextResponse.json({ sessions: [] }, { status: 200 });
  }
}

