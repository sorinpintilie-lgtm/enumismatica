import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type TemplatesFile = Record<string, { subject: string; html: string; text?: string }>;

let templatesCache: { loadedAt: number; data: TemplatesFile } | null = null;

async function loadTemplates(): Promise<TemplatesFile> {
  const now = Date.now();
  if (templatesCache && now - templatesCache.loadedAt < 60_000) {
    console.log('Using cached templates');
    return templatesCache.data;
  }

  const filePath = path.join(process.cwd(), 'public', 'email.json');
  console.log('Loading templates from:', filePath);
  try {
    const raw = await readFile(filePath, 'utf8');
    const data = JSON.parse(raw) as TemplatesFile;
    console.log('Templates loaded successfully. Available templates:', Object.keys(data));
    templatesCache = { loadedAt: now, data };
    return data;
  } catch (error) {
    console.error('Failed to load templates:', error);
    throw new Error('Failed to load email templates');
  }
}

// Helper function to call the internal email API
async function sendInternalEmail(templateKey: string, vars: Record<string, any>) {
  console.log('Calling internal email API with template:', templateKey);
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'marketing@monetariastatului.ro',
        templateKey,
        vars: {
          app_name: 'Enumismatica.ro',
          site_url: 'https://enumismatica.ro',
          ...vars,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Internal email API error:', response.status, errorData);
      throw new Error(`Email API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    console.log('Internal email API call successful');
    return await response.json();
  } catch (error) {
    console.error('Failed to call internal email API:', error);
    throw new Error(`Failed to send email via internal API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function sendPronumismaticaFormEmail(data: any) {
  console.log('sendPronumismaticaFormEmail called with data:', data);

  // Use the internal email API instead of direct SendGrid
  const vars = {
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

  // For testing purposes, send to sorin.pintilie@sky.ro instead of marketing@monetariastatului.ro
  // This can be changed back to production email when ready
  const targetEmail = 'sorin.pintilie@sky.ro'; // Test email address
  
  // For testing purposes, override the default recipient in vars
  const emailVars = { ...vars, email: targetEmail };
  await sendInternalEmail('pronumismatica_form', emailVars);
  console.log('Email sent successfully via internal API to:', targetEmail);
}

async function sendPronumismaticaFormEmailWithIdImages(data: any, images: any) {
  console.log('sendPronumismaticaFormEmailWithIdImages called with data:', data);

  // For forms with ID images, we need to handle attachments differently
  // Since the internal email API doesn't support attachments, we'll use the basic template
  // and include a note about the attachments
  
  const vars = {
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
    // Add note about attachments
    attachments_note: 'Acest formular include acte de identitate atașate care vor fi procesate separat.',
  };

  // Use the template for forms with images
  await sendInternalEmail('pronumismatica_form_with_images', vars);
  console.log('Email sent successfully via internal API');

  // TODO: In a production environment, you would need to:
  // 1. Upload the attachment files to cloud storage (Firebase Storage, S3, etc.)
  // 2. Include download links in the email or process them separately
  // 3. Notify the recipient about the attachments through another channel
  
  console.log('Note: ID image attachments need to be handled separately in production');
}

export async function POST(req: NextRequest) {
  console.log('PRONUMISMATICA API: Received request');
  try {
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    // Support both legacy JSON submissions and new multipart submissions with ID images.
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data submission');
      const formData = await req.formData();
      console.log('Form data keys:', Array.from(formData.keys()));

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

      console.log('Extracted form data:', { lastName, firstName, cnp, country, county, city, address, idType, idSeries, phone, email });

      const idFront = formData.get('idFront');
      const idBack = formData.get('idBack');
      console.log('ID files:', { idFront: idFront ? 'present' : 'missing', idBack: idBack ? 'present' : 'missing' });

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
        console.error('Missing required fields');
        return NextResponse.json(
          { error: 'Câmpuri obligatorii lipsă în formular.' },
          { status: 400 },
        );
      }

      if (!(idFront instanceof File) || !(idBack instanceof File)) {
        console.error('ID files are not valid File objects');
        return NextResponse.json(
          { error: 'Te rugăm să încarci ambele imagini (față și verso).' },
          { status: 400 },
        );
      }

      console.log('ID file types:', idFront.type, idBack.type);
      if (!idFront.type.startsWith('image/') || !idBack.type.startsWith('image/')) {
        console.error('ID files are not images');
        return NextResponse.json(
          { error: 'Fișierele încărcate trebuie să fie imagini.' },
          { status: 400 },
        );
      }

      console.log('ID file sizes:', idFront.size, idBack.size);
      // 15MB max per image (align with storage rules logic)
      const maxSize = 15 * 1024 * 1024;
      if (idFront.size > maxSize || idBack.size > maxSize) {
        console.error('ID files are too large');
        return NextResponse.json(
          { error: 'Imaginile sunt prea mari (maxim 15MB fiecare).' },
          { status: 400 },
        );
      }

      console.log('Converting files to buffers');
      const frontBuf = Buffer.from(await idFront.arrayBuffer());
      const backBuf = Buffer.from(await idBack.arrayBuffer());
      console.log('Buffers created successfully');

      console.log('Sending email with ID images');
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
      console.log('Email sent successfully');

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
    if (error instanceof Error) {
      console.error('Error stack trace:', error.stack);
      return NextResponse.json(
        { error: `A apărut o eroare la procesarea formularului: ${error.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: 'A apărut o eroare la procesarea formularului.' },
      { status: 500 },
    );
  }
}

