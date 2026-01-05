import { NextRequest, NextResponse } from 'next/server';
import { sendEmailWithAttachments } from '../../lib/sendgridEmail';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type TemplatesFile = Record<string, { subject: string; html: string; text?: string }>;

let templatesCache: { loadedAt: number; data: TemplatesFile } | null = null;

async function loadTemplates(): Promise<TemplatesFile> {
  const now = Date.now();
  if (templatesCache && now - templatesCache.loadedAt < 60_000) {
    return templatesCache.data;
  }

  const filePath = path.join(process.cwd(), 'public', 'email.json');
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw) as TemplatesFile;
  templatesCache = { loadedAt: now, data };
  return data;
}

async function sendPronumismaticaFormEmail(data: any) {
  const templates = await loadTemplates();
  const template = templates.pronumismatica_form || templates.fallback_default;

  const vars = {
    app_name: 'Enumismatica.ro',
    site_url: 'https://enumismatica.ro',
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
  };

  const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k as keyof typeof vars] || '');
  const html = template.html.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k as keyof typeof vars] || '');

  await sendEmailWithAttachments({
    to: 'sorin.pintilie@sky.ro',
    subject,
    html,
    text: template.text?.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k as keyof typeof vars] || ''),
    attachments: [],
  });
}

async function sendPronumismaticaFormEmailWithIdImages(data: any, images: any) {
  const templates = await loadTemplates();
  const template = templates.pronumismatica_form_with_images || templates.pronumismatica_form || templates.fallback_default;

  const vars = {
    app_name: 'Enumismatica.ro',
    site_url: 'https://enumismatica.ro',
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
  };

  const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k as keyof typeof vars] || '');
  const html = template.html.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k as keyof typeof vars] || '');

  const attachments = images.map((img: any) => ({
    filename: img.filename,
    contentType: img.contentType,
    contentBase64: img.data.toString('base64'),
  }));

  await sendEmailWithAttachments({
    to: 'sorin.pintilie@sky.ro',
    subject,
    html,
    text: template.text?.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k as keyof typeof vars] || ''),
    attachments,
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Support both legacy JSON submissions and new multipart submissions with ID images.
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
        return NextResponse.json(
          { error: 'Câmpuri obligatorii lipsă în formular.' },
          { status: 400 },
        );
      }

      if (!(idFront instanceof File) || !(idBack instanceof File)) {
        return NextResponse.json(
          { error: 'Te rugăm să încarci ambele imagini (față și verso).' },
          { status: 400 },
        );
      }

      if (!idFront.type.startsWith('image/') || !idBack.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Fișierele încărcate trebuie să fie imagini.' },
          { status: 400 },
        );
      }

      // 15MB max per image (align with storage rules logic)
      const maxSize = 15 * 1024 * 1024;
      if (idFront.size > maxSize || idBack.size > maxSize) {
        return NextResponse.json(
          { error: 'Imaginile sunt prea mari (maxim 15MB fiecare).' },
          { status: 400 },
        );
      }

      const frontBuf = Buffer.from(await idFront.arrayBuffer());
      const backBuf = Buffer.from(await idBack.arrayBuffer());

      await sendPronumismaticaFormEmailWithIdImages(
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
        },
        {
          front: {
            filename: idFront.name || 'id-front.jpg',
            contentType: idFront.type || 'image/jpeg',
            data: frontBuf,
          },
          back: {
            filename: idBack.name || 'id-back.jpg',
            contentType: idBack.type || 'image/jpeg',
            data: backBuf,
          },
        },
      );

      return NextResponse.json({ success: true });
    }

    const body = await req.json();

    const {
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
    } = body || {};

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
      return NextResponse.json(
        { error: 'Câmpuri obligatorii lipsă în formular.' },
        { status: 400 },
      );
    }

    await sendPronumismaticaFormEmail({
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
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling PRONUMISMATICA form submission:', error);
    return NextResponse.json(
      { error: 'A apărut o eroare la procesarea formularului.' },
      { status: 500 },
    );
  }
}

