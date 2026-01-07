import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../../lib/apiAuth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const snap = await adminDb
      .collection('users')
      .doc(user.uid)
      .collection('trustedDevices')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const devices = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        label: data.label || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return NextResponse.json({ devices });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('trusted-devices/list error:', err);
    return NextResponse.json({ error: 'Failed to list trusted devices' }, { status: 500 });
  }
}

