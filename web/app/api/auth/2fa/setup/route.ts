import { NextRequest, NextResponse } from 'next/server';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate a secret for the user
    const secret = speakeasy.generateSecret({
      name: `eNumismatica (${userId.slice(0, 8)})`,
      issuer: 'eNumismatica.ro',
      length: 32,
    });

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url || '');

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeDataURL,
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}
