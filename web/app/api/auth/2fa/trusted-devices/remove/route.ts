import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../../lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 });
    }

    const body = await req.json();
    const deviceId = String(body?.deviceId || '').trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    await adminDb.collection('users').doc(user.uid).collection('trustedDevices').doc(deviceId).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('trusted-devices/remove error:', err);
    return NextResponse.json({ error: 'Failed to remove trusted device' }, { status: 500 });
  }
}

