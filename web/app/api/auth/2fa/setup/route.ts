import { NextRequest, NextResponse } from 'next/server';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireVerifiedUser(request);

    // Generate a secret for the user
    const secret = speakeasy.generateSecret({
      name: `eNumismatica (${user.uid.slice(0, 8)})`,
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}
