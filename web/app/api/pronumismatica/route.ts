import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { validCnp } from '../../../lib/validatorsRo/cnp';

const PRONUMISMATICA_TO_EMAIL = process.env.PRONUMISMATICA_TO_EMAIL || 'sorin.pintilie@sky.ro';
const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@enumismatica.ro';
const APP_NAME = 'Enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://enumismatica.ro';

type Template = { subject: string; html: string; text: string };
type TemplatesFile = Record<string, Template>;

type SendgridAttachment = {
  content: string; // base64
  filename: string;
  type?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
};

let templatesCache: { loadedAt: number; data: TemplatesFile } | null = null;

function loadTemplates(): TemplatesFile {
  const now = Date.now();
  if (templatesCache && now - templatesCache.loadedAt < 60_000) {
    return templatesCache.data;
  }

  const templatesPath = path.join(process.cwd(), 'public', 'email-templates.json');
  const raw = fs.readFileSync(templatesPath, 'utf-8');
  const cleaned = raw.replace(/^\uFEFF/, '');
  const data = JSON.parse(cleaned) as TemplatesFile;
  templatesCache = { loadedAt: now, data };
  return data;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyVars(input: string, vars: Record<string, unknown>) {
  let out = input;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    out = out.replace(new RegExp(escapeRegExp(placeholder), 'g'), String(value ?? ''));
  }
  return out;
}

function renderTemplate(
  templateKey: string,
  vars: Record<string, unknown>,
  fallbackKey?: string,
): Template {
  const templates = loadTemplates();
  const base = templates[templateKey] || (fallbackKey ? templates[fallbackKey] : undefined);

  const template: Template =
    base ||
    ({
      subject: 'Notificare de la E-numismatica.ro',
      html: '<p>Ai primit o notificare de la platforma noastră.</p>',
      text: 'Ai primit o notificare de la platforma noastră.',
    } satisfies Template);

  return {
    subject: applyVars(template.subject, vars),
    html: applyVars(template.html, vars),
    text: applyVars(template.text, vars),
  };
}

async function sendTemplateEmail(input: {
  to: string;
  templateKey: string;
  vars: Record<string, unknown>;
  fallbackKey?: string;
  attachments?: SendgridAttachment[];
}) {
  const sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
  if (!sendgridKey) {
    throw new Error('Email service is not configured (missing SendGrid API key)');
  }
  sgMail.setApiKey(sendgridKey);

  const rendered = renderTemplate(input.templateKey, input.vars, input.fallbackKey);

  const msg: any = {
    to: input.to,
    from: FROM_EMAIL,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  };

  if (input.attachments?.length) {
    msg.attachments = input.attachments;
  }

  await sgMail.send(msg);
}

async function sendAdminEmail(data: any, attachments?: SendgridAttachment[]) {
  const vars = {
    app_name: APP_NAME,
    site_url: SITE_URL,
    lastName: data.lastName,
    firstName: data.firstName,
    cnp: data.cnp,
    country: data.country,
    county: data.county,
    city: data.city,
    address: data.address,
    idType: data.idType,
    idSeries: data.idSeries,
    phone: data.phone,
    email: data.email,
    attachments_note: data.attachments_note,
  };

  const templateKey = attachments?.length ? 'pronumismatica_form_with_images' : 'pronumismatica_form';

  await sendTemplateEmail({
    to: PRONUMISMATICA_TO_EMAIL,
    templateKey,
    vars,
    attachments,
  });
}

async function trySendUserConfirmation(data: any) {
  const to = String(data.email || '').trim();
  if (!to) return;

  const vars = {
    app_name: APP_NAME,
    site_url: SITE_URL,
    lastName: data.lastName,
    firstName: data.firstName,
    email: data.email,
    phone: data.phone,
  };

  try {
    await sendTemplateEmail({
      to,
      templateKey: 'pronumismatica_user_confirmation',
      vars,
    });
  } catch (error) {
    // Confirmation must not fail the whole submission.
    console.error('Pronumismatica user confirmation email failed:', error);
  }
}

export async function POST(req: NextRequest) {
  console.log('PRONUMISMATICA API: Received request');
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const lastName = String(formData.get('lastName') || '').trim();
      const firstName = String(formData.get('firstName') || '').trim();
      const cnp = String(formData.get('cnp') || '').trim();
      const country = String(formData.get('country') || '').trim();
      const county = String(formData.get('county') || '').trim();
      const city = String(formData.get('city') || '').trim();
      const address = String(formData.get('address') || '').trim();
      const idType = String(formData.get('idType') || '').trim();
      const idSeries = String(formData.get('idSeries') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const email = String(formData.get('email') || '').trim();

      const idFront = formData.get('idFront');
      const idBack = formData.get('idBack');

      if (
        !lastName ||
        !firstName ||
        !cnp ||
        !country ||
        !county ||
        !city ||
        !address ||
        !idType ||
        !idSeries ||
        !phone ||
        !email
      ) {
        return NextResponse.json({ error: 'Câmpuri obligatorii lipsă în formular.' }, { status: 400 });
      }

      if (!validCnp(cnp)) {
        return NextResponse.json({ error: 'CNP invalid.' }, { status: 400 });
      }

      if (!idFront || !idBack) {
        return NextResponse.json(
          { error: 'Te rugăm să încarci ambele imagini (față și verso).' },
          { status: 400 },
        );
      }
      if (!(idFront instanceof File) || !(idBack instanceof File)) {
        return NextResponse.json(
          { error: 'Fișierele încărcate nu sunt valide.' },
          { status: 400 },
        );
      }

      if (!idFront.type.startsWith('image/') || !idBack.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Fișierele încărcate trebuie să fie imagini.' }, { status: 400 });
      }

      // Attachments are base64; keep conservative.
      const maxSize = 7 * 1024 * 1024;
      if (idFront.size > maxSize || idBack.size > maxSize) {
        return NextResponse.json({ error: 'Imaginile sunt prea mari (maxim 7MB fiecare).' }, { status: 400 });
      }

      const idFrontBase64 = Buffer.from(await idFront.arrayBuffer()).toString('base64');
      const idBackBase64 = Buffer.from(await idBack.arrayBuffer()).toString('base64');

      const attachments: SendgridAttachment[] = [
        {
          content: idFrontBase64,
          filename: idFront.name || 'id-front.jpg',
          type: idFront.type || 'image/jpeg',
          disposition: 'attachment',
        },
        {
          content: idBackBase64,
          filename: idBack.name || 'id-back.jpg',
          type: idBack.type || 'image/jpeg',
          disposition: 'attachment',
        },
      ];

      const attachments_note = `Acte atașate: ${attachments[0].filename} (${Math.round(
        idFront.size / 1024,
      )} KB) și ${attachments[1].filename} (${Math.round(idBack.size / 1024)} KB).`;

      await sendAdminEmail(
        {
          lastName,
          firstName,
          cnp,
          country,
          county,
          city,
          address,
          idType,
          idSeries,
          phone,
          email,
          attachments_note,
        },
        attachments,
      );

      await trySendUserConfirmation({ lastName, firstName, phone, email });

      return NextResponse.json({ success: true });
    }

    // Legacy JSON submission
    const body = await req.json();
    const { lastName, firstName, cnp, country, county, city, address, idType, idSeries, phone, email } = body || {};

    if (
      !lastName ||
      !firstName ||
      !cnp ||
      !country ||
      !county ||
      !city ||
      !address ||
      !idType ||
      !idSeries ||
      !phone ||
      !email
    ) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă în formular.' }, { status: 400 });
    }

    if (!validCnp(String(cnp))) {
      return NextResponse.json({ error: 'CNP invalid.' }, { status: 400 });
    }

    await sendAdminEmail({ lastName, firstName, cnp, country, county, city, address, idType, idSeries, phone, email });
    await trySendUserConfirmation({ lastName, firstName, phone, email });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling PRONUMISMATICA form submission:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `A apărut o eroare la procesarea formularului: ${msg}` },
      { status: 500 },
    );
  }
}

