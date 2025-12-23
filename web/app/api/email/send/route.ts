import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Configure SendGrid
const sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
if (!sendgridKey) {
  throw new Error('SENDGRID_API_KEY or SENDGRID_KEY environment variable is required');
}
sgMail.setApiKey(sendgridKey);

const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enumismatica.ro';

// Generate plain text email content as fallback
function generatePlainTextEmail(templateKey: string, vars: Record<string, unknown>): string {
  switch (templateKey) {
    case 'account_welcome':
      return `Bun venit pe E-numismatica.ro!

Bună, ${vars.user_name || 'Utilizator'}!

Contul tău a fost creat cu succes. Poți accesa platforma la: ${vars.login_link || SITE_URL}

Mulțumim că te-ai alăturat comunității noastre!

Echipa E-numismatica.ro`;

    case 'account_password_reset_requested':
      return `Resetare parolă - E-numismatica.ro

Bună, ${vars.user_name || 'Utilizator'}!

Ai solicitat resetarea parolei. Poți reseta parola folosind următorul link: ${vars.reset_link}

Dacă nu ai solicitat acest lucru, ignoră acest email.

Echipa E-numismatica.ro`;

    case 'bid_outbid':
      return `Ai fost depășit în licitație - E-numismatica.ro

Bună, ${vars.user_name || 'Utilizator'}!

Ai fost depășit în licitația pentru ${vars.listing_title}.

Prețul curent este: ${vars.current_price} ${vars.currency}.

Poți licita din nou aici: ${vars.auction_link}

Echipa E-numismatica.ro`;

    case 'auction_won_buyer':
      return `Felicitări! Ai câștigat licitația - E-numismatica.ro

Bună, ${vars.buyer_name || 'Utilizator'}!

Felicitări! Ai câștigat licitația pentru ${vars.listing_title} cu ${vars.amount} ${vars.currency}.

Vânzătorul: ${vars.seller_name}

Poți vedea detaliile tranzacției aici: ${vars.transaction_link}

Poți contacta vânzătorul aici: ${vars.conversation_link}

Echipa E-numismatica.ro`;

    case 'purchase_confirmation_buyer':
      return `Confirmare achiziție - E-numismatica.ro

Bună, ${vars.buyer_name || 'Utilizator'}!

Ai achiziționat cu succes ${vars.listing_title} pentru ${vars.amount} ${vars.currency}.

Poți vedea detaliile tranzacției aici: ${vars.transaction_link}

Poți contacta vânzătorul aici: ${vars.conversation_link}

Echipa E-numismatica.ro`;

    case 'product_sold_seller':
      return `Produs vândut - E-numismatica.ro

Bună, ${vars.user_name || 'Vânzător'}!

Produsul tău ${vars.listing_title} a fost vândut pentru ${vars.amount} ${vars.currency}.

Cumpărător: ${vars.buyer_name}

Poți vedea detaliile în dashboard: ${vars.action_link}

Echipa E-numismatica.ro`;

    case 'auction_sold_seller':
      return `Licitație vândută - E-numismatica.ro

Bună, ${vars.user_name || 'Vânzător'}!

Licitația pentru ${vars.listing_title} s-a încheiat cu succes. A fost vândută pentru ${vars.amount} ${vars.currency}.

Câștigător: ${vars.buyer_name}

Poți vedea detaliile aici: ${vars.action_link}

Echipa E-numismatica.ro`;

    case 'product_approved':
      return `Produs aprobat - E-numismatica.ro

Bună, ${vars.user_name || 'Utilizator'}!

Produsul tău ${vars.listing_title} a fost aprobat și este acum live pe platformă.

Poți vedea produsul aici: ${vars.listing_link}

Echipa E-numismatica.ro`;

    case 'product_rejected':
      return `Produs respins - E-numismatica.ro

Bună, ${vars.user_name || 'Utilizator'}!

Produsul tău ${vars.listing_title} nu a putut fi aprobat.

Motiv: ${vars.event_message}

Poți încerca din nou sau contactează-ne pentru ajutor: ${SITE_URL}/contact

Echipa E-numismatica.ro`;

    case 'auction_approved':
      return `Licitație aprobată - E-numismatica.ro

Bună, ${vars.user_name || 'Utilizator'}!

Licitația pentru ${vars.listing_title} a fost aprobată și este acum activă.

Poți vedea licitația aici: ${vars.auction_link}

Echipa E-numismatica.ro`;

    case 'auction_rejected':
      return `Licitație respinsă - E-numismatica.ro

Bună, ${vars.user_name || 'Utilizator'}!

Licitația pentru ${vars.listing_title} nu a putut fi aprobată.

Motiv: ${vars.event_message}

Poți încerca din nou sau contactează-ne pentru ajutor: ${SITE_URL}/contact

Echipa E-numismatica.ro`;

    default:
      return `Notificare de la E-numismatica.ro

${vars.event_message || 'Ai primit o notificare de la platforma noastră.'}

Poți accesa platforma aici: ${SITE_URL}

Echipa E-numismatica.ro`;
  }
}

// Email templates mapping
const EMAIL_TEMPLATES = {
  account_welcome: {
    subject: 'Bun venit pe E-numismatica.ro!',
    templateId: process.env.SENDGRID_TEMPLATE_WELCOME || 'd-welcome-template-id', // Replace with actual template ID
  },
  account_password_reset_requested: {
    subject: 'Resetare parolă - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_PASSWORD_RESET || 'd-password-reset-template-id',
  },
  account_blocked: {
    subject: 'Cont blocat temporar - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_ACCOUNT_BLOCKED || 'd-account-blocked-template-id',
  },
  event_registration_confirmed: {
    subject: 'Înregistrare eveniment confirmată',
    templateId: process.env.SENDGRID_TEMPLATE_EVENT_CONFIRMATION || 'd-event-confirmation-template-id',
  },
  purchase_confirmation_buyer: {
    subject: 'Confirmare achiziție - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_PURCHASE_BUYER || 'd-purchase-buyer-template-id',
  },
  bid_outbid: {
    subject: 'Ai fost depășit în licitație - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_OUTBID || 'd-outbid-template-id',
  },
  auction_won_buyer: {
    subject: 'Felicitări! Ai câștigat licitația - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_AUCTION_WON || 'd-auction-won-template-id',
  },
  product_sold_seller: {
    subject: 'Produs vândut - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_PRODUCT_SOLD || 'd-product-sold-template-id',
  },
  auction_sold_seller: {
    subject: 'Licitație vândută - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_AUCTION_SOLD || 'd-auction-sold-template-id',
  },
  product_approved: {
    subject: 'Produs aprobat - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_PRODUCT_APPROVED || 'd-product-approved-template-id',
  },
  product_rejected: {
    subject: 'Produs respins - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_PRODUCT_REJECTED || 'd-product-rejected-template-id',
  },
  auction_approved: {
    subject: 'Licitație aprobată - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_AUCTION_APPROVED || 'd-auction-approved-template-id',
  },
  auction_rejected: {
    subject: 'Licitație respinsă - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_AUCTION_REJECTED || 'd-auction-rejected-template-id',
  },
  fallback_default: {
    subject: 'Notificare de la E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_FALLBACK_DEFAULT || 'd-fallback-default-template-id',
  },
  fallback_security: {
    subject: 'Notificare de securitate - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_FALLBACK_SECURITY || 'd-fallback-security-template-id',
  },
  fallback_transaction: {
    subject: 'Notificare tranzacție - E-numismatica.ro',
    templateId: process.env.SENDGRID_TEMPLATE_FALLBACK_TRANSACTION || 'd-fallback-transaction-template-id',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, templateKey, vars = {}, fallbackKey } = body;

    if (!to || !templateKey) {
      return NextResponse.json(
        { error: 'Missing required fields: to and templateKey' },
        { status: 400 }
      );
    }

    // Get template configuration
    let template = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES];

    // Fallback to fallback template if specified and primary template not found
    if (!template && fallbackKey) {
      template = EMAIL_TEMPLATES[fallbackKey as keyof typeof EMAIL_TEMPLATES];
    }

    // Final fallback
    if (!template) {
      template = EMAIL_TEMPLATES.fallback_default;
    }

    // Prepare email data
    let msg: any = {
      to,
      from: FROM_EMAIL,
      subject: template.subject,
      dynamicTemplateData: {
        ...vars,
        site_url: SITE_URL,
      },
    };

    // If template ID is set and not a placeholder, use template, otherwise send plain text
    const isPlaceholder = template.templateId && /^d-.*-template-id$/.test(template.templateId);
    if (template.templateId && !isPlaceholder) {
      msg.templateId = template.templateId;
    } else {
      // Fallback to plain text email
      const plainTextContent = generatePlainTextEmail(templateKey, vars);
      msg.text = plainTextContent;
      msg.subject = template.subject; // Set subject for plain text
      delete msg.dynamicTemplateData;
    }

    // Send email
    await sgMail.send(msg);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}