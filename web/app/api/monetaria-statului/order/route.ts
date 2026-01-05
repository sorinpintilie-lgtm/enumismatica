import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@enumismatica.ro';
const TEST_EMAIL = 'sorin.pintilie@sky.ro'; // Test email address
const PRODUCTION_EMAIL = 'marketing@monetariastatului.ro';

// Use production email
const TARGET_EMAIL = PRODUCTION_EMAIL;

export async function POST(request: NextRequest) {
  try {
    const sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
    if (!sendgridKey) {
      return NextResponse.json(
        { error: 'Email service is not configured (missing SendGrid API key)' },
        { status: 500 }
      );
    }
    sgMail.setApiKey(sendgridKey);

    const body = await request.json();
    const { 
      customerName, 
      customerSurname, 
      customerAddress, 
      customerPhone, 
      customerEmail,
      productTitle, 
      productPrice, 
      productId 
    } = body;

    // Validate required fields
    if (!customerName || !customerSurname || !customerAddress || !customerPhone || !customerEmail || 
        !productTitle || !productPrice || !productId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create email content
    const emailContent = {
      subject: `Comandă nouă de la eNumismatica.ro - ${productTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #e7b73c; border-bottom: 2px solid #e7b73c; padding-bottom: 10px; }
            .info { background-color: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Comandă nouă Monetaria Statului</h1>
          <div class="info">
            <p><strong>Detalii client:</strong></p>
            <p>Nume: ${customerName}</p>
            <p>Prenume: ${customerSurname}</p>
            <p>Adresă: ${customerAddress}</p>
            <p>Telefon: ${customerPhone}</p>
            <p>Email: ${customerEmail}</p>
          </div>
          <div class="info">
            <p><strong>Detalii comandă:</strong></p>
            <p>Produs: ${productTitle}</p>
            <p>Preț: ${productPrice}</p>
            <p>ID Produs: ${productId}</p>
          </div>
          <p>Acest client dorește să achiziționeze produsul menționat. Vă rugăm să contactați clientul folosind datele de contact furnizate pentru a finaliza comanda.</p>
          <div class="footer">
            <p>Cu stimă,<br>Echipa eNumismatica.ro</p>
            <p>Acest email a fost trimis automat. Te rugăm să nu răspunzi la acest mesaj.</p>
          </div>
        </body>
        </html>
      `,
      text: `Comandă nouă de la eNumismatica.ro

Nume: ${customerName}
Prenume: ${customerSurname}
Adresă: ${customerAddress}
Telefon: ${customerPhone}
Email: ${customerEmail}

Produs: ${productTitle}
Preț: ${productPrice}
ID Produs: ${productId}

Acest client dorește să achiziționeze produsul menționat. Vă rugăm să contactați clientul pentru a finaliza comanda.

Echipa eNumismatica.ro`
    };

    // Prepare email data
    const msg = {
      to: TARGET_EMAIL,
      from: FROM_EMAIL,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    // Send email
    console.log('Sending Monetaria Statului order email to:', TARGET_EMAIL);
    
    try {
      await sgMail.send(msg);
      console.log('Monetaria Statului order email sent successfully to:', TARGET_EMAIL);
      return NextResponse.json({ success: true });
    } catch (sendError: any) {
      console.error('SendGrid error:', sendError.response?.body || sendError);
      throw new Error(`SendGrid error: ${JSON.stringify(sendError.response?.body || sendError.message)}`);
    }
  } catch (error) {
    console.error('Monetaria Statului order error:', error);
    return NextResponse.json(
      { error: 'Failed to send order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}