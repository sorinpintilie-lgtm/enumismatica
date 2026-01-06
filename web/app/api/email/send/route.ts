import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';

type SendgridAttachment = {
  content: string; // base64
  filename: string;
  type?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
};

// Configure SendGrid
// IMPORTANT:
// Do NOT throw at module import time.
// Next.js may evaluate route modules during build (page data collection).
// We validate env vars inside the handler instead.

const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enumismatica.ro';

// Load email templates
let emailTemplatesData: Record<string, { subject: string; html: string; text: string }> = {};
try {
  const templatesPath = path.join(process.cwd(), 'public', 'email-templates.json');
  const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
  // Some editors may save JSON with a UTF-8 BOM which breaks JSON.parse.
  // Strip it defensively so builds/runtime don't fail to load templates.
  emailTemplatesData = JSON.parse(templatesContent.replace(/^\uFEFF/, ''));
} catch (error) {
  console.error('Failed to load email templates:', error);
}


export async function POST(request: NextRequest) {
  try {
    const sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
    if (!sendgridKey) {
      return NextResponse.json(
        { error: 'Email service is not configured (missing SendGrid API key)' },
        { status: 500 },
      );
    }
    sgMail.setApiKey(sendgridKey);

    const body = await request.json();
    const { to, templateKey, vars = {}, fallbackKey, attachments } = body;

    console.log('Email API called:', { to, templateKey, fallbackKey });

    if (!to || !templateKey) {
      return NextResponse.json(
        { error: 'Missing required fields: to and templateKey' },
        { status: 400 }
      );
    }

    // Get template from JSON file
    let template = emailTemplatesData[templateKey];

    // Fallback to fallback template if specified
    if (!template && fallbackKey) {
      template = emailTemplatesData[fallbackKey];
    }

    // Final fallback
    if (!template) {
      template = {
        subject: 'Notificare de la E-numismatica.ro',
        html: '<p>Ai primit o notificare de la platforma noastră.</p>',
        text: 'Ai primit o notificare de la platforma noastră.'
      };
    }

    // Replace template variables
    let htmlContent = template.html;
    let textContent = template.text;
    
    Object.entries(vars).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
      textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    // Prepare email data
    const msg: any = {
      to,
      from: FROM_EMAIL,
      subject: template.subject,
      text: textContent,
      html: htmlContent,
    };

    // Optional attachments (SendGrid expects base64 content)
    if (Array.isArray(attachments) && attachments.length > 0) {
      const normalized: SendgridAttachment[] = attachments
        .filter(Boolean)
        .map((a: any) => ({
          content: String(a.content || ''),
          filename: String(a.filename || 'attachment'),
          type: a.type ? String(a.type) : undefined,
          disposition: a.disposition === 'inline' ? 'inline' : 'attachment',
          contentId: a.contentId ? String(a.contentId) : undefined,
        }));

      // Basic safety: avoid huge payloads accidentally taking down the function.
      // NOTE: SendGrid has its own max size limits; keep this conservative.
      const totalBase64Chars = normalized.reduce((sum, a) => sum + (a.content?.length || 0), 0);
      const MAX_TOTAL_BASE64_CHARS = 28 * 1024 * 1024; // ~28MB of base64 chars (rough safety guard)
      if (totalBase64Chars > MAX_TOTAL_BASE64_CHARS) {
        return NextResponse.json(
          { error: 'Attachments are too large' },
          { status: 413 },
        );
      }

      msg.attachments = normalized;
    }

    // Send email
    console.log('Sending email:', { to, from: FROM_EMAIL, subject: template.subject });
    
    try {
      await sgMail.send(msg);
      console.log('Email sent successfully to:', to);
      return NextResponse.json({ success: true });
    } catch (sendError: any) {
      console.error('SendGrid error:', sendError.response?.body || sendError);
      throw new Error(`SendGrid error: ${JSON.stringify(sendError.response?.body || sendError.message)}`);
    }
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
