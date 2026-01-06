import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { validCnp } from '../../../lib/validatorsRo/cnp';
import tinify from 'tinify';

export const runtime = 'nodejs';

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

function makeReqId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTinifyKey(): string | null {
  return process.env.TINIFY_API_KEY || null;
}

function toBufferAsync(source: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    source.toBuffer((err: any, resultData: Buffer) => {
      if (err) return reject(err);
      resolve(resultData);
    });
  });
}

async function compressIdImageToWebp(input: Buffer, reqId: string, label: string): Promise<Buffer> {
  const key = getTinifyKey();
  if (!key) {
    console.warn('PRONUMISMATICA API: Tinify key missing; skipping compression', { reqId, label });
    return input;
  }

  tinify.key = key;

  // Best-effort: convert to WebP, and if still large, resize down.
  // ID photos usually have lots of detail; keep dimensions relatively high.
  const attempts: Array<{ width?: number; name: string }> = [
    { name: 'convert-only' },
    { width: 1600, name: 'scale-1600' },
    { width: 1200, name: 'scale-1200' },
    { width: 1000, name: 'scale-1000' },
  ];

  let best: Buffer | null = null;

  for (const step of attempts) {
    let src = tinify.fromBuffer(input);
    if (step.width) {
      src = src.resize({ method: 'scale', width: step.width });
    }
    src = src.convert({ type: 'image/webp' });

    const out = await toBufferAsync(src);
    if (!best || out.length < best.length) best = out;

    console.log('PRONUMISMATICA API: Tinify attempt', {
      reqId,
      label,
      step: step.name,
      inBytes: input.length,
      outBytes: out.length,
    });

    // Stop early if we got a reasonably small attachment.
    if (out.length <= 900 * 1024) {
      return out;
    }
  }

  return best || input;
}

async function prepareAttachment(file: File, reqId: string, label: string): Promise<{
  buffer: Buffer;
  filename: string;
  type: string;
  inBytes: number;
  outBytes: number;
}> {
  const raw = Buffer.from(await file.arrayBuffer());
  const key = getTinifyKey();

  // If Tinify isn't configured, keep the original bytes + metadata.
  if (!key) {
    return {
      buffer: raw,
      filename: file.name || `${label}.jpg`,
      type: file.type || 'application/octet-stream',
      inBytes: raw.length,
      outBytes: raw.length,
    };
  }

  const optimized = await compressIdImageToWebp(raw, reqId, label);
  const base = (file.name || label).replace(/\.[^/.]+$/, '');
  return {
    buffer: optimized,
    filename: `${base}.webp`,
    type: 'image/webp',
    inBytes: raw.length,
    outBytes: optimized.length,
  };
}

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
  const reqId = makeReqId();
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
        console.warn('PRONUMISMATICA API: Invalid CNP provided (redacted)', {
          cnpLength: cnp.length,
          last4: cnp.slice(-4),
        });
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

      console.log('PRONUMISMATICA API: Attachments received', {
        reqId,
        idFrontBytes: idFront.size,
        idFrontType: idFront.type,
        idBackBytes: idBack.size,
        idBackType: idBack.type,
      });

      const front = await prepareAttachment(idFront, reqId, 'id-front');
      const back = await prepareAttachment(idBack, reqId, 'id-back');

      const idFrontBase64 = front.buffer.toString('base64');
      const idBackBase64 = back.buffer.toString('base64');

      const attachments: SendgridAttachment[] = [
        {
          content: idFrontBase64,
          filename: front.filename,
          type: front.type,
          disposition: 'attachment',
        },
        {
          content: idBackBase64,
          filename: back.filename,
          type: back.type,
          disposition: 'attachment',
        },
      ];

      const attachments_note = `Acte atașate: ${attachments[0].filename} (${Math.round(
        front.outBytes / 1024,
      )} KB) și ${attachments[1].filename} (${Math.round(back.outBytes / 1024)} KB).`;

      console.log('PRONUMISMATICA API: Attachments compressed', {
        reqId,
        idFrontInBytes: front.inBytes,
        idFrontOutBytes: front.outBytes,
        idBackInBytes: back.inBytes,
        idBackOutBytes: back.outBytes,
      });

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
      console.warn('PRONUMISMATICA API: Invalid CNP provided (legacy JSON)');
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

