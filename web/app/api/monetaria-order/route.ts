import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const orderData = await request.json();

    // Validate required fields
    const requiredFields = ['nume', 'prenume', 'adresa', 'telefon', 'email', 'piesaCommandata', 'pret'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json(
          { error: `Câmpul ${field} este obligatoriu` },
          { status: 400 }
        );
      }
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const emailContent = `
      <h2>Comandă nouă de la eNumismatica.ro</h2>
      <p><strong>Nume:</strong> ${orderData.nume}</p>
      <p><strong>Prenume:</strong> ${orderData.prenume}</p>
      <p><strong>Adresă:</strong> ${orderData.adresa}</p>
      <p><strong>Telefon:</strong> ${orderData.telefon}</p>
      <p><strong>Email:</strong> ${orderData.email}</p>
      <p><strong>Piesă comandată:</strong> ${orderData.piesaCommandata}</p>
      <p><strong>Preț:</strong> ${orderData.pret}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('ro-RO')}</p>
    `;

    // Send email to Monetaria Statului
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'marketing@monetariastatului.ro',
      subject: `Comandă nouă: ${orderData.piesaCommandata}`,
      html: emailContent,
    });

    return NextResponse.json(
      { message: 'Comandă trimisă cu succes' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Eroare la procesarea comenzii:', error);
    return NextResponse.json(
      { error: 'Eroare la procesarea comenzii' },
      { status: 500 }
    );
  }
}