import { NextResponse } from 'next/server';
import { MonetariaOrderTemplate } from '../email-templates/monetariaOrderTemplate';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const orderData = await request.json();

    // Validate required fields
    const requiredFields = ['nume', 'prenume', 'adresa', 'piesaCommandata', 'pret', 'telefon', 'email'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Generate email content
    const emailContent = MonetariaOrderTemplate({
      nume: orderData.nume,
      prenume: orderData.prenume,
      adresa: orderData.adresa,
      piesaCommandata: orderData.piesaCommandata,
      pret: orderData.pret,
      telefon: orderData.telefon,
      email: orderData.email,
    });

    // Send email to Monetaria Statului
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'Simona.badea@monetariastatului.ro',
      subject: `Comandă nouă de la ${orderData.nume} ${orderData.prenume}`,
      html: emailContent,
    });

    // Send confirmation email to customer
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: orderData.email,
      subject: 'Confirmare comandă către Monetăria Statului',
      html: `
        <p>Monetăria Statului a fost informată cu privire la intenția dumneavoastră de achiziție.</p>
        <p>În cel mai scurt timp veți fi contactat prin datele furnizate în cererea de comandă (e-mail / telefon).</p>
        <p>eNumismatica.ro transmite exclusiv datele dumneavoastră către Monetăria Statului și nu este implicată direct în procesul de achiziție.</p>
      `,
    });

    return NextResponse.json(
      { message: 'Comanda a fost trimisă cu succes către Monetăria Statului' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending Monetaria Statului order:', error);
    return NextResponse.json(
      { error: 'A apărut o eroare la trimiterea comenzii' },
      { status: 500 }
    );
  }
}
