import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { adminAuth } from '../../../lib/firebaseAdmin';

const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://enumismatica.ro';

type TemplateEntry = { subject: string; html: string; text: string };

function loadTemplates(): Record<string, TemplateEntry> {
  try {
    const templatesPath = path.join(process.cwd(), 'public', 'email-templates.json');
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    return JSON.parse(templatesContent.replace(/^\uFEFF/, ''));
  } catch (error) {
    console.error('Failed to load email templates:', error);
    return {};
  }
}

function applyVars(template: TemplateEntry, vars: Record<string, unknown>) {
  let html = template.html;
  let text = template.text;
  let subject = template.subject;

  for (const [key, value] of Object.entries(vars || {})) {
    const placeholder = `{{${key}}}`;
    html = html.replace(new RegExp(placeholder, 'g'), String(value));
    text = text.replace(new RegExp(placeholder, 'g'), String(value));
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return { html, text, subject };
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const sanitizedEmail = String(email || '').trim().toLowerCase();
    if (!sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // If Admin SDK is not configured we cannot generate a secure reset link.
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Password reset is not configured on the server (missing Firebase Admin credentials).' },
        { status: 503 },
      );
    }

    const sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
    if (!sendgridKey) {
      return NextResponse.json(
        { error: 'Email service is not configured (missing SendGrid API key)' },
        { status: 500 },
      );
    }
    sgMail.setApiKey(sendgridKey);

    // Generate Firebase password reset link (includes the OOB code).
    // We intentionally always respond success to avoid user enumeration.
    let resetLink: string | null = null;
    let displayName: string | null = null;
    try {
      const userRecord = await adminAuth.getUserByEmail(sanitizedEmail);
      displayName = userRecord.displayName || null;
      resetLink = await adminAuth.generatePasswordResetLink(sanitizedEmail, {
        url: `${SITE_URL}/login`,
        handleCodeInApp: false,
      });
    } catch (err) {
      console.warn('[password-reset] getUserByEmail/generate link failed (non-fatal):', err);
      // Keep resetLink null; still return success.
    }

    if (!resetLink) {
      return NextResponse.json({ success: true });
    }

    const templates = loadTemplates();
    const template = templates.account_password_reset_requested;
    const fallback = templates.fallback_security || templates.fallback_default;
    const chosen = template || fallback;

    if (!chosen) {
      // Very defensive fallback.
      await sgMail.send({
        to: sanitizedEmail,
        from: FROM_EMAIL,
        subject: 'Resetare parolă - eNumismatica.ro',
        text: `Folosește acest link pentru resetarea parolei: ${resetLink}`,
        html: `<p>Folosește acest link pentru resetarea parolei:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      });
      return NextResponse.json({ success: true });
    }

    const rendered = applyVars(chosen, {
      user_name: displayName || 'Utilizator',
      reset_link: resetLink,
    });

    await sgMail.send({
      to: sanitizedEmail,
      from: FROM_EMAIL,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Password reset API error:', error);
    return NextResponse.json(
      { error: 'Failed to request password reset' },
      { status: 500 },
    );
  }
}

