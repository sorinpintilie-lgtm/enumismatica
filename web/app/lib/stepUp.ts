import type { NextRequest } from 'next/server';
import admin, { adminDb } from './firebaseAdmin';
import { AuthError, requireVerifiedUser } from './apiAuth';

export type StepUpAction =
  | 'account_export'
  | 'account_delete'
  | '2fa_disable'
  | 'email_change'
  | 'account_deactivate'
  | 'account_reactivate'
  | 'retention_redact_messages'
  | 'retention_purge_ips'
  | 'orders_share_shipping'
  | 'orders_view_banking'
  | 'orders_view_shipping';

export function getStepUpTokenFromRequest(req: NextRequest): string | null {
  const v =
    req.headers.get('x-step-up-token') ||
    req.headers.get('X-Step-Up-Token') ||
    req.headers.get('x-stepup-token') ||
    req.headers.get('X-Stepup-Token');
  return v ? String(v).trim() : null;
}

export async function requireStepUp(req: NextRequest, action: StepUpAction): Promise<{ tokenId: string; userId: string }> {
  const user = await requireVerifiedUser(req);

  const tokenId = getStepUpTokenFromRequest(req);
  if (!tokenId) {
    throw new AuthError('Missing step-up token (X-Step-Up-Token)', 403);
  }
  if (!adminDb) {
    throw new AuthError('Server database is not configured.', 503);
  }

  const snap = await adminDb.collection('stepUpTokens').doc(tokenId).get();
  if (!snap.exists) {
    throw new AuthError('Invalid step-up token', 403);
  }

  const data = snap.data() as any;
  if (data.userId !== user.uid) {
    throw new AuthError('Step-up token does not belong to this user', 403);
  }
  if (data.usedAt) {
    throw new AuthError('Step-up token already used', 403);
  }

  const expiresAt = data.expiresAt?.toDate?.() ? data.expiresAt.toDate() : null;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw new AuthError('Step-up token expired', 403);
  }

  const actions: string[] = Array.isArray(data.actions) ? data.actions : [];
  if (!actions.includes(action)) {
    throw new AuthError('Step-up token does not allow this action', 403);
  }

  // Consume (one-time use) to prevent replay.
  await snap.ref.set(
    {
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { tokenId, userId: user.uid };
}

export async function issueStepUpToken(userId: string, actions: StepUpAction[], ttlMinutes = 10): Promise<string> {
  if (!adminDb) {
    throw new AuthError('Server database is not configured.', 503);
  }

  const ref = adminDb.collection('stepUpTokens').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await ref.set({
    userId,
    actions,
    createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromDate(expires),
    usedAt: null,
  });

  return ref.id;
}

