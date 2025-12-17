import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.SES_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SES_SECRET_ACCESS_KEY || '',
  },
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'contact@enumismatica.ro';
const SITE_NAME = 'Enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enumismatica.ro';

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Send an email using AWS SES
 */
async function sendEmail({ to, subject, htmlBody, textBody }: EmailParams): Promise<void> {
  const params: SendEmailCommandInput = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        ...(textBody && {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        }),
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Generate email HTML template wrapper
 */
function emailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_NAME}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #000940 0%, #001a5c 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #e7b73c;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #e7b73c;
      color: #000940;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: #e7b73c;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${SITE_NAME}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. Toate drepturile rezervate.</p>
      <p>
        <a href="${SITE_URL}">Vizitează site-ul</a> | 
        <a href="${SITE_URL}/help">Ajutor</a> | 
        <a href="${SITE_URL}/contact">Contact</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Welcome email for new account
 */
export async function sendWelcomeEmail(email: string, displayName: string): Promise<void> {
  const content = `
    <h2>Bun venit la ${SITE_NAME}!</h2>
    <p>Salut ${displayName},</p>
    <p>Îți mulțumim că te-ai alăturat comunității noastre de colecționari și pasionați de numismatică!</p>
    <p>Acum poți:</p>
    <ul>
      <li>Participa la licitații pentru monede rare</li>
      <li>Cumpăra direct din magazin</li>
      <li>Vinde propriile articole</li>
      <li>Gestiona colecția ta personală</li>
    </ul>
    <a href="${SITE_URL}/auctions" class="button">Explorează Licitațiile</a>
    <p>Dacă ai întrebări, echipa noastră este aici să te ajute!</p>
  `;

  await sendEmail({
    to: email,
    subject: `Bun venit la ${SITE_NAME}!`,
    htmlBody: emailTemplate(content),
    textBody: `Bun venit la ${SITE_NAME}! Îți mulțumim că te-ai alăturat comunității noastre.`,
  });
}

/**
 * Password reset email
 */
export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  const content = `
    <h2>Resetare Parolă</h2>
    <p>Ai solicitat resetarea parolei pentru contul tău ${SITE_NAME}.</p>
    <p>Apasă pe butonul de mai jos pentru a-ți reseta parola:</p>
    <a href="${resetLink}" class="button">Resetează Parola</a>
    <p>Acest link este valabil 1 oră.</p>
    <p><strong>Dacă nu ai solicitat resetarea parolei, ignoră acest email.</strong></p>
  `;

  await sendEmail({
    to: email,
    subject: 'Resetare Parolă - ' + SITE_NAME,
    htmlBody: emailTemplate(content),
    textBody: `Resetare parolă: ${resetLink}`,
  });
}

/**
 * Account blocked notification
 */
export async function sendAccountBlockedEmail(email: string, reason: string): Promise<void> {
  const content = `
    <h2>Cont Blocat</h2>
    <p>Contul tău ${SITE_NAME} a fost blocat temporar.</p>
    <p><strong>Motiv:</strong> ${reason}</p>
    <p>Pentru mai multe informații sau pentru a contesta această decizie, te rugăm să contactezi echipa de suport.</p>
    <a href="${SITE_URL}/contact" class="button">Contactează Suportul</a>
  `;

  await sendEmail({
    to: email,
    subject: 'Cont Blocat - ' + SITE_NAME,
    htmlBody: emailTemplate(content),
    textBody: `Contul tău a fost blocat. Motiv: ${reason}`,
  });
}

/**
 * Event registration confirmation
 */
export async function sendEventConfirmationEmail(
  email: string,
  eventName: string,
  eventDetails: string
): Promise<void> {
  const content = `
    <h2>Confirmare Înregistrare Eveniment</h2>
    <p>Înregistrarea ta pentru <strong>${eventName}</strong> a fost confirmată!</p>
    <p>${eventDetails}</p>
    <p>Îți vom trimite mai multe detalii pe măsură ce evenimentul se apropie.</p>
    <a href="${SITE_URL}" class="button">Vizitează Site-ul</a>
  `;

  await sendEmail({
    to: email,
    subject: `Confirmare Înregistrare: ${eventName}`,
    htmlBody: emailTemplate(content),
    textBody: `Înregistrarea ta pentru ${eventName} a fost confirmată!`,
  });
}

/**
 * Product purchase confirmation
 */
export async function sendPurchaseConfirmationEmail(
  email: string,
  productName: string,
  price: number,
  orderId: string
): Promise<void> {
  const content = `
    <h2>Confirmare Comandă</h2>
    <p>Comanda ta a fost plasată cu succes!</p>
    <p><strong>Produs:</strong> ${productName}</p>
    <p><strong>Preț:</strong> ${price.toFixed(2)} RON</p>
    <p><strong>Număr comandă:</strong> ${orderId}</p>
    <p>Vei primi un email de confirmare când produsul va fi expediat.</p>
    <a href="${SITE_URL}/orders/${orderId}" class="button">Vezi Comanda</a>
  `;

  await sendEmail({
    to: email,
    subject: 'Confirmare Comandă - ' + SITE_NAME,
    htmlBody: emailTemplate(content),
    textBody: `Comanda ta pentru ${productName} a fost plasată cu succes. Număr comandă: ${orderId}`,
  });
}

/**
 * Outbid notification
 */
export async function sendOutbidEmail(
  email: string,
  auctionTitle: string,
  currentBid: number,
  auctionId: string
): Promise<void> {
  const content = `
    <h2>Ai Fost Depășit!</h2>
    <p>Cineva a licitat mai mult decât tine pentru <strong>${auctionTitle}</strong>.</p>
    <p><strong>Licitație curentă:</strong> ${currentBid.toFixed(2)} RON</p>
    <p>Licitează din nou pentru a rămâne în cursă!</p>
    <a href="${SITE_URL}/auctions/${auctionId}" class="button">Licitează Acum</a>
  `;

  await sendEmail({
    to: email,
    subject: `Ai fost depășit - ${auctionTitle}`,
    htmlBody: emailTemplate(content),
    textBody: `Ai fost depășit la licitația pentru ${auctionTitle}. Licitație curentă: ${currentBid.toFixed(2)} RON`,
  });
}

/**
 * Auction won notification
 */
export async function sendAuctionWonEmail(
  email: string,
  auctionTitle: string,
  finalBid: number,
  auctionId: string
): Promise<void> {
  const content = `
    <h2>🎉 Felicitări! Ai Câștigat Licitația!</h2>
    <p>Ai câștigat licitația pentru <strong>${auctionTitle}</strong>!</p>
    <p><strong>Preț final:</strong> ${finalBid.toFixed(2)} RON</p>
    <p>Vei fi contactat în curând pentru finalizarea tranzacției.</p>
    <a href="${SITE_URL}/auctions/${auctionId}" class="button">Vezi Detalii</a>
  `;

  await sendEmail({
    to: email,
    subject: `🎉 Ai câștigat licitația - ${auctionTitle}`,
    htmlBody: emailTemplate(content),
    textBody: `Felicitări! Ai câștigat licitația pentru ${auctionTitle}. Preț final: ${finalBid.toFixed(2)} RON`,
  });
}

/**
 * Product sold notification (for seller)
 */
export async function sendProductSoldEmail(
  email: string,
  productName: string,
  price: number,
  buyerName: string
): Promise<void> {
  const content = `
    <h2>Produsul Tău A Fost Vândut!</h2>
    <p>Felicitări! Produsul tău <strong>${productName}</strong> a fost vândut.</p>
    <p><strong>Preț de vânzare:</strong> ${price.toFixed(2)} RON</p>
    <p><strong>Cumpărător:</strong> ${buyerName}</p>
    <p>Vei fi contactat în curând pentru finalizarea tranzacției.</p>
    <a href="${SITE_URL}/dashboard" class="button">Vezi Dashboard</a>
  `;

  await sendEmail({
    to: email,
    subject: `Produs vândut - ${productName}`,
    htmlBody: emailTemplate(content),
    textBody: `Produsul tău ${productName} a fost vândut pentru ${price.toFixed(2)} RON.`,
  });
}

/**
 * Auction sold notification (for seller)
 */
export async function sendAuctionSoldEmail(
  email: string,
  auctionTitle: string,
  finalBid: number,
  winnerName: string,
  auctionId: string
): Promise<void> {
  const content = `
    <h2>Licitația Ta S-a Încheiat Cu Succes!</h2>
    <p>Licitația pentru <strong>${auctionTitle}</strong> s-a încheiat.</p>
    <p><strong>Preț final:</strong> ${finalBid.toFixed(2)} RON</p>
    <p><strong>Câștigător:</strong> ${winnerName}</p>
    <p>Vei fi contactat în curând pentru finalizarea tranzacției.</p>
    <a href="${SITE_URL}/auctions/${auctionId}" class="button">Vezi Detalii</a>
  `;

  await sendEmail({
    to: email,
    subject: `Licitație încheiată - ${auctionTitle}`,
    htmlBody: emailTemplate(content),
    textBody: `Licitația pentru ${auctionTitle} s-a încheiat. Preț final: ${finalBid.toFixed(2)} RON`,
  });
}

/**
 * Product approved notification
 */
export async function sendProductApprovedEmail(
  email: string,
  productName: string,
  productId: string
): Promise<void> {
  const content = `
    <h2>✅ Produsul Tău A Fost Aprobat!</h2>
    <p>Produsul tău <strong>${productName}</strong> a fost aprobat de administratori și este acum vizibil în magazin.</p>
    <a href="${SITE_URL}/products/${productId}" class="button">Vezi Produsul</a>
  `;

  await sendEmail({
    to: email,
    subject: `Produs aprobat - ${productName}`,
    htmlBody: emailTemplate(content),
    textBody: `Produsul tău ${productName} a fost aprobat și este acum vizibil în magazin.`,
  });
}

/**
 * Product rejected notification
 */
export async function sendProductRejectedEmail(
  email: string,
  productName: string,
  reason: string
): Promise<void> {
  const content = `
    <h2>Produs Respins</h2>
    <p>Din păcate, produsul tău <strong>${productName}</strong> nu a fost aprobat.</p>
    <p><strong>Motiv:</strong> ${reason}</p>
    <p>Te rugăm să revizuiești produsul și să îl trimiți din nou pentru aprobare.</p>
    <a href="${SITE_URL}/dashboard" class="button">Revizuiește Produsul</a>
  `;

  await sendEmail({
    to: email,
    subject: `Produs respins - ${productName}`,
    htmlBody: emailTemplate(content),
    textBody: `Produsul tău ${productName} nu a fost aprobat. Motiv: ${reason}`,
  });
}

/**
 * Auction approved notification
 */
export async function sendAuctionApprovedEmail(
  email: string,
  auctionTitle: string,
  auctionId: string
): Promise<void> {
  const content = `
    <h2>✅ Licitația Ta A Fost Aprobată!</h2>
    <p>Licitația ta pentru <strong>${auctionTitle}</strong> a fost aprobată de administratori și este acum activă.</p>
    <a href="${SITE_URL}/auctions/${auctionId}" class="button">Vezi Licitația</a>
  `;

  await sendEmail({
    to: email,
    subject: `Licitație aprobată - ${auctionTitle}`,
    htmlBody: emailTemplate(content),
    textBody: `Licitația ta pentru ${auctionTitle} a fost aprobată și este acum activă.`,
  });
}

/**
 * Auction rejected notification
 */
export async function sendAuctionRejectedEmail(
  email: string,
  auctionTitle: string,
  reason: string
): Promise<void> {
  const content = `
    <h2>Licitație Respinsă</h2>
    <p>Din păcate, licitația ta pentru <strong>${auctionTitle}</strong> nu a fost aprobată.</p>
    <p><strong>Motiv:</strong> ${reason}</p>
    <p>Te rugăm să revizuiești licitația și să o trimiți din nou pentru aprobare.</p>
    <a href="${SITE_URL}/dashboard" class="button">Revizuiește Licitația</a>
  `;

  await sendEmail({
    to: email,
    subject: `Licitație respinsă - ${auctionTitle}`,
    htmlBody: emailTemplate(content),
    textBody: `Licitația ta pentru ${auctionTitle} nu a fost aprobată. Motiv: ${reason}`,
  });
}

interface PronumismaticaFormData {
  lastName: string;
  firstName: string;
  cnp: string;
  country: string;
  county: string;
  city: string;
  address: string;
  idType: string;
  idSeries: string;
  phone: string;
  email: string;
}

export async function sendPronumismaticaFormEmail(
  data: PronumismaticaFormData,
): Promise<void> {
  const content = `
    <h2>Formular nou PRONUMISMATICA</h2>
    <p>A fost completat un nou formular de interes pentru Asociația PRONUMISMATICA.</p>
    <h3>Detalii persoană</h3>
    <ul>
      <li><strong>Nume:</strong> ${data.lastName}</li>
      <li><strong>Prenume:</strong> ${data.firstName}</li>
      <li><strong>CNP:</strong> ${data.cnp}</li>
    </ul>
    <h3>Adresă</h3>
    <ul>
      <li><strong>Țara:</strong> ${data.country}</li>
      <li><strong>Județ:</strong> ${data.county}</li>
      <li><strong>Oraș:</strong> ${data.city}</li>
      <li><strong>Adresă:</strong> ${data.address}</li>
    </ul>
    <h3>Act de identitate</h3>
    <ul>
      <li><strong>Tip:</strong> ${data.idType}</li>
      <li><strong>Serie / număr:</strong> ${data.idSeries}</li>
    </ul>
    <h3>Date de contact</h3>
    <ul>
      <li><strong>Telefon:</strong> ${data.phone}</li>
      <li><strong>Email:</strong> ${data.email}</li>
    </ul>
  `;

  await sendEmail({
    to: 'bogdan.epure@sky.ro',
    subject: 'Formular nou PRONUMISMATICA - eNumismatica.ro',
    htmlBody: emailTemplate(content),
    textBody:
      `Formular nou PRONUMISMATICA:\n` +
      `Nume: ${data.lastName}\n` +
      `Prenume: ${data.firstName}\n` +
      `CNP: ${data.cnp}\n` +
      `Țara: ${data.country}\n` +
      `Județ: ${data.county}\n` +
      `Oraș: ${data.city}\n` +
      `Adresă: ${data.address}\n` +
      `Tip act: ${data.idType}\n` +
      `Serie/număr: ${data.idSeries}\n` +
      `Telefon: ${data.phone}\n` +
      `Email: ${data.email}`,
  });
}

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAccountBlockedEmail,
  sendEventConfirmationEmail,
  sendPurchaseConfirmationEmail,
  sendOutbidEmail,
  sendAuctionWonEmail,
  sendProductSoldEmail,
  sendAuctionSoldEmail,
  sendProductApprovedEmail,
  sendProductRejectedEmail,
  sendAuctionApprovedEmail,
  sendAuctionRejectedEmail,
  sendPronumismaticaFormEmail,
};
