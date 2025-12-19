import { NextRequest, NextResponse } from 'next/server';
import {
  sendPronumismaticaFormEmail,
  sendPronumismaticaFormEmailWithIdImages,
} from 'shared/emailService';

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

