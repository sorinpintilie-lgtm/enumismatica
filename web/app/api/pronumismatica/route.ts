import { NextRequest, NextResponse } from 'next/server';

const PRONUMISMATICA_TO_EMAIL = process.env.PRONUMISMATICA_TO_EMAIL || 'sorin.pintilie@sky.ro';
const APP_NAME = 'Enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://enumismatica.ro';

// Helper function to call the internal email API.
// IMPORTANT: do not call localhost in production. We derive the origin from the incoming request URL.
async function sendInternalEmail(
  emailEndpoint: string,
  to: string,
  templateKey: string,
  vars: Record<string, any>,
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type?: string;
    disposition?: 'attachment' | 'inline';
  }>,
) {
  console.log('Calling internal email API:', { emailEndpoint, templateKey });

  try {
    const response = await fetch(emailEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        templateKey,
        vars: {
          app_name: APP_NAME,
          site_url: SITE_URL,
          ...vars,
        },
        attachments,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Internal email API error:', response.status, errorData);
      throw new Error(
        `Email API failed: ${response.status} - ${
          (errorData as any)?.error || (errorData as any)?.details || 'Unknown error'
        }`,
      );
    }

    console.log('Internal email API call successful');
    return await response.json();
  } catch (error) {
    console.error('Failed to call internal email API:', error);
    throw new Error(
      `Failed to send email via internal API: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function sendPronumismaticaFormEmail(emailEndpoint: string, data: any) {
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

  await sendInternalEmail(emailEndpoint, PRONUMISMATICA_TO_EMAIL, 'pronumismatica_form', vars);
  console.log('Admin email sent successfully via internal API to:', PRONUMISMATICA_TO_EMAIL);
}

async function sendPronumismaticaFormEmailWithIdImages(
  emailEndpoint: string,
  data: any,
  imagesMeta: {
    front: { filename: string; contentType: string; size: number };
    back: { filename: string; contentType: string; size: number };
  },
  attachments: Array<{ content: string; filename: string; type?: string; disposition?: 'attachment' | 'inline' }>,
) {
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
    attachments_note: `Acte încărcate: ${imagesMeta.front.filename} (${Math.round(
      imagesMeta.front.size / 1024,
    )} KB, ${imagesMeta.front.contentType}) și ${imagesMeta.back.filename} (${Math.round(
      imagesMeta.back.size / 1024,
    )} KB, ${imagesMeta.back.contentType}).`,
  };

  // Use the template for forms with images
  await sendInternalEmail(
    emailEndpoint,
    PRONUMISMATICA_TO_EMAIL,
    'pronumismatica_form_with_images',
    vars,
    attachments,
  );
  console.log('Email sent successfully via internal API');

  // TODO: In a production environment, you would need to:
  // 1. Upload the attachment files to cloud storage (Firebase Storage, S3, etc.)
  // 2. Include download links in the email or process them separately
  // 3. Notify the recipient about the attachments through another channel
  
  console.log('Note: ID images were attached to the admin email (SendGrid attachments).');
}

async function sendPronumismaticaUserConfirmation(emailEndpoint: string, data: any) {
  const to = String(data.email || '').trim();
  if (!to) return;

  const vars = {
    lastName: data.lastName,
    firstName: data.firstName,
    email: data.email,
    phone: data.phone,
  };

  await sendInternalEmail(
    emailEndpoint,
    to,
    'pronumismatica_user_confirmation',
    vars,
  );
}

export async function POST(req: NextRequest) {
  console.log('PRONUMISMATICA API: Received request');
  try {
    // Build a same-origin absolute URL for the internal email route.
    // This avoids relying on NEXT_PUBLIC_SITE_URL (which may be missing) and avoids localhost in production.
    const emailEndpoint = new URL('/api/email/send', req.url).toString();

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

      // Check if ID files are provided and valid
      if (idFront && !(idFront instanceof File)) {
        console.error('ID front file is not a valid File object');
        return NextResponse.json(
          { error: 'Fișierul față al actului de identitate nu este valid.' },
          { status: 400 },
        );
      }

      if (idBack && !(idBack instanceof File)) {
        console.error('ID back file is not a valid File object');
        return NextResponse.json(
          { error: 'Fișierul verso al actului de identitate nu este valid.' },
          { status: 400 },
        );
      }

      // If no ID files are provided, proceed without images
      if (!idFront && !idBack) {
        console.log('No ID files provided, proceeding without images');
        await sendPronumismaticaFormEmail(emailEndpoint, {
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
        await sendPronumismaticaUserConfirmation(emailEndpoint, {
          lastName,
          firstName,
          phone,
          email,
        });
        return NextResponse.json({ success: true });
      }
      // If only one file is provided, return an error
      if ((idFront && !idBack) || (!idFront && idBack)) {
        console.error('Only one ID file provided');
        return NextResponse.json(
          { error: 'Te rugăm să încarci ambele imagini (față și verso).' },
          { status: 400 },
        );
      }

      // At this point both files must be present and validated.
      const idFrontFile = idFront as File;
      const idBackFile = idBack as File;

      console.log('ID file types:', idFrontFile.type, idBackFile.type);
      if (!idFrontFile.type.startsWith('image/') || !idBackFile.type.startsWith('image/')) {
        console.error('ID files are not images');
        return NextResponse.json(
          { error: 'Fișierele încărcate trebuie să fie imagini.' },
          { status: 400 },
        );
      }

      console.log('ID file sizes:', idFrontFile.size, idBackFile.size);
      // Attachments are sent via SendGrid (base64-encoded), so keep a conservative size.
      // 7MB binary ~= 9.3MB base64.
      const maxSize = 7 * 1024 * 1024;
      if (idFrontFile.size > maxSize || idBackFile.size > maxSize) {
        console.error('ID files are too large');
        return NextResponse.json(
          { error: 'Imaginile sunt prea mari (maxim 7MB fiecare).' },
          { status: 400 },
        );
      }

      console.log('Sending email with ID images');

      // Encode attachments for SendGrid.
      // NOTE: base64 adds ~33% overhead; large images may be rejected by SendGrid.
      const idFrontBase64 = Buffer.from(await idFrontFile.arrayBuffer()).toString('base64');
      const idBackBase64 = Buffer.from(await idBackFile.arrayBuffer()).toString('base64');

      await sendPronumismaticaFormEmailWithIdImages(
        emailEndpoint,
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
            filename: idFrontFile.name || 'id-front.jpg',
            contentType: idFrontFile.type || 'image/jpeg',
            size: idFrontFile.size,
          },
          back: {
            filename: idBackFile.name || 'id-back.jpg',
            contentType: idBackFile.type || 'image/jpeg',
            size: idBackFile.size,
          },
        },
        [
          {
            content: idFrontBase64,
            filename: idFrontFile.name || 'id-front.jpg',
            type: idFrontFile.type || 'image/jpeg',
            disposition: 'attachment',
          },
          {
            content: idBackBase64,
            filename: idBackFile.name || 'id-back.jpg',
            type: idBackFile.type || 'image/jpeg',
            disposition: 'attachment',
          },
        ],
      );
      console.log('Email sent successfully');

      await sendPronumismaticaUserConfirmation(emailEndpoint, {
        lastName,
        firstName,
        phone,
        email,
      });

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

    await sendPronumismaticaFormEmail(emailEndpoint, {
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

    await sendPronumismaticaUserConfirmation(emailEndpoint, {
      lastName,
      firstName,
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

