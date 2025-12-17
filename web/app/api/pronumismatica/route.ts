import { NextRequest, NextResponse } from 'next/server';
import { sendPronumismaticaFormEmail } from 'shared/emailService';

export async function POST(req: NextRequest) {
  try {
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

