import { NextRequest, NextResponse } from 'next/server';
import * as speakeasy from 'speakeasy';

export async function POST(request: NextRequest) {
  try {
    const { userId, code, secret } = await request.json();

    if (!userId || !code || !secret) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps before/after for clock drift
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}
