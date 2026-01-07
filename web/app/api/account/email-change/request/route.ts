import { NextRequest, NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '../../../../lib/firebaseAdmin';
import { AuthError, requireVerifiedUser } from '../../../../lib/apiAuth';
import { requireStepUp } from '../../../../lib/stepUp';
import sgMail from '@sendgrid/mail';
import crypto from 'node:crypto';

const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://enumismatica.ro';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    await requireStepUp(req, 'email_change');

    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Server auth/db is not configured.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const newEmail = String(body?.newEmail || '').trim().toLowerCase();
    if (!newEmail || !isValidEmail(newEmail)) {
      return NextResponse.json({ error: 'Adresă de email invalidă.' }, { status: 400 });
    }

    const userRecord = await adminAuth.getUser(user.uid);
    const oldEmail = (userRecord.email || user.email || '').toLowerCase();
    if (!oldEmail) {
      return NextResponse.json({ error: 'Contul nu are o adresă de email asociată.' }, { status: 400 });
    }
    if (oldEmail === newEmail) {
      return NextResponse.json({ error: 'Noua adresă este identică cu cea curentă.' }, { status: 400 });
    }

    // Prepare SendGrid
    const sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
    if (!sendgridKey) {
      return NextResponse.json({ error: 'Email service is not configured (missing SendGrid API key)' }, { status: 500 });
    }
    sgMail.setApiKey(sendgridKey);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000));

    await adminDb.collection('emailChangeRequests').doc(token).set({
      userId: user.uid,
      oldEmail,
      newEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      usedAt: null,
    });

    const confirmLink = `${SITE_URL}/api/account/email-change/confirm?token=${encodeURIComponent(token)}`;

    // Email to new address (confirm)
    await sgMail.send({
      to: newEmail,
      from: FROM_EMAIL,
      subject: 'Confirmă schimbarea adresei de email - eNumismatica.ro',
      text: `A fost solicitată schimbarea adresei de email pentru contul tău eNumismatica.ro.

Confirmă schimbarea accesând acest link (valabil 30 minute):
${confirmLink}

Dacă nu ai cerut această schimbare, ignoră acest email.`,
      html: `<p>A fost solicitată schimbarea adresei de email pentru contul tău eNumismatica.ro.</p>
<p><a href="${confirmLink}">Confirmă schimbarea adresei</a> (valabil 30 minute)</p>
<p>Dacă nu ai cerut această schimbare, ignoră acest email.</p>`,
    });

    // Alert old address
    await sgMail
      .send({
        to: oldEmail,
        from: FROM_EMAIL,
        subject: 'Alertă securitate: cerere schimbare email - eNumismatica.ro',
        text: `A fost inițiată o cerere de schimbare a adresei de email pentru contul tău.

Noua adresă: ${newEmail}

Dacă nu ai făcut tu această cerere, contactează-ne imediat: ${SITE_URL}/contact`,
        html: `<p>A fost inițiată o cerere de schimbare a adresei de email pentru contul tău.</p>
<p><b>Noua adresă:</b> ${newEmail}</p>
<p>Dacă nu ai făcut tu această cerere, contactează-ne imediat: <a href="${SITE_URL}/contact">${SITE_URL}/contact</a></p>`,
      })
      .catch((e) => console.warn('[email-change] failed to send old-email alert (non-fatal):', e));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('email-change/request error:', err);
    return NextResponse.json({ error: 'Failed to request email change' }, { status: 500 });
  }
}

