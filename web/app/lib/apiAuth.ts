import type { NextRequest } from 'next/server';
import { adminAuth } from './firebaseAdmin';

export type VerifiedUser = {
  uid: string;
  email?: string;
  name?: string;
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function requireVerifiedUser(req: NextRequest): Promise<VerifiedUser> {
  if (!adminAuth) {
    throw new AuthError(
      'Server auth is not configured (missing Firebase Admin credentials).',
      503,
    );
  }

  const token = getBearerToken(req);
  if (!token) throw new AuthError('Missing Authorization: Bearer <token>', 401);

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: (decoded as any).email,
      name: (decoded as any).name,
    };
  } catch {
    throw new AuthError('Invalid or expired auth token', 401);
  }
}

export function getRequestIp(req: NextRequest): string | null {
  // Netlify / proxies typically set x-forwarded-for
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

