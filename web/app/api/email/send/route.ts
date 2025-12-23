import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Configure SendGrid
const sendgridKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
if (!sendgridKey) {
  throw new Error('SENDGRID_API_KEY or SENDGRID_KEY environment variable is required');
}
sgMail.setApiKey(sendgridKey);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@enumismatica.ro';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enumismatica.ro';

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
    const msg = {
      to,
      from: FROM_EMAIL,
      templateId: template.templateId,
      dynamicTemplateData: {
        ...vars,
        site_url: SITE_URL,
      },
    };

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