/**
 * Email service (client-safe): calls the Next.js API route that performs the
 * actual SendGrid send on the server.
 */

export type EmailTemplateKey = string;

type SendTemplateEmailInput = {
  to: string;
  templateKey: EmailTemplateKey;
  vars?: Record<string, unknown>;
  fallbackKey?: EmailTemplateKey;
};

const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';

function isBrowser() {
  return typeof window !== 'undefined';
}

export async function sendTemplateEmail(input: SendTemplateEmailInput): Promise<void> {
  const url = isBrowser() ? '/api/email/send' : `${DEFAULT_SITE_URL}/api/email/send`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to send email (${res.status}): ${body}`);
  }
}

// =============================================================================
// High-level helpers (used across the app)
// =============================================================================

export async function sendWelcomeEmail(email: string, displayName: string): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'account_welcome',
    vars: {
      user_name: displayName,
      login_link: `${DEFAULT_SITE_URL}/login`,
    },
    fallbackKey: 'fallback_default',
  });
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'account_password_reset_requested',
    vars: {
      user_name: 'Utilizator',
      reset_link: resetLink,
    },
    fallbackKey: 'fallback_security',
  });
}

export async function sendAccountBlockedEmail(email: string, reason: string): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'account_blocked',
    vars: {
      user_name: 'Utilizator',
      event_title: 'Cont blocat',
      event_message: `Contul tău a fost blocat temporar. Motiv: ${reason}`,
      action_link: `${DEFAULT_SITE_URL}/contact`,
    },
    fallbackKey: 'fallback_security',
  });
}

export async function sendEventConfirmationEmail(
  email: string,
  eventName: string,
  eventDetails: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'event_registration_confirmed',
    vars: {
      user_name: 'Utilizator',
      event_title: eventName,
      event_message: eventDetails,
      action_link: DEFAULT_SITE_URL,
    },
    fallbackKey: 'fallback_default',
  });
}

export async function sendPurchaseConfirmationEmail(
  email: string,
  productName: string,
  price: number,
  orderId: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'purchase_confirmation_buyer',
    vars: {
      buyer_name: 'Utilizator',
      listing_title: productName,
      amount: price.toFixed(2),
      currency: 'RON',
      transaction_link: `${DEFAULT_SITE_URL}/orders/${orderId}`,
      conversation_link: `${DEFAULT_SITE_URL}/messages`,
      seller_name: 'Vânzător',
    },
    fallbackKey: 'fallback_transaction',
  });
}

export async function sendOutbidEmail(
  email: string,
  auctionTitle: string,
  currentBid: number,
  auctionId: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'bid_outbid',
    vars: {
      user_name: 'Utilizator',
      listing_title: auctionTitle,
      current_price: currentBid.toFixed(2),
      currency: 'RON',
      auction_link: `${DEFAULT_SITE_URL}/auctions/${auctionId}`,
    },
    fallbackKey: 'fallback_default',
  });
}

export async function sendAuctionWonEmail(
  email: string,
  auctionTitle: string,
  finalBid: number,
  auctionId: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'auction_won_buyer',
    vars: {
      buyer_name: 'Utilizator',
      listing_title: auctionTitle,
      amount: finalBid.toFixed(2),
      currency: 'RON',
      seller_name: 'Vânzător',
      transaction_link: `${DEFAULT_SITE_URL}/auctions/${auctionId}`,
      conversation_link: `${DEFAULT_SITE_URL}/messages`,
    },
    fallbackKey: 'fallback_transaction',
  });
}

export async function sendProductSoldEmail(
  email: string,
  productName: string,
  price: number,
  buyerName: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'product_sold_seller',
    vars: {
      user_name: 'Vânzător',
      listing_title: productName,
      amount: price.toFixed(2),
      currency: 'RON',
      buyer_name: buyerName,
      action_link: `${DEFAULT_SITE_URL}/dashboard`,
    },
    fallbackKey: 'fallback_transaction',
  });
}

export async function sendAuctionSoldEmail(
  email: string,
  auctionTitle: string,
  finalBid: number,
  winnerName: string,
  auctionId: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'auction_sold_seller',
    vars: {
      user_name: 'Vânzător',
      listing_title: auctionTitle,
      amount: finalBid.toFixed(2),
      currency: 'RON',
      buyer_name: winnerName,
      action_link: `${DEFAULT_SITE_URL}/auctions/${auctionId}`,
    },
    fallbackKey: 'fallback_transaction',
  });
}

export async function sendProductApprovedEmail(
  email: string,
  productName: string,
  productId: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'product_approved',
    vars: {
      user_name: 'Utilizator',
      listing_title: productName,
      listing_link: `${DEFAULT_SITE_URL}/products/${productId}`,
      action_link: `${DEFAULT_SITE_URL}/products/${productId}`,
    },
    fallbackKey: 'fallback_default',
  });
}

export async function sendProductRejectedEmail(
  email: string,
  productName: string,
  reason: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'product_rejected',
    vars: {
      user_name: 'Utilizator',
      listing_title: productName,
      event_message: reason,
      action_link: `${DEFAULT_SITE_URL}/dashboard`,
    },
    fallbackKey: 'fallback_default',
  });
}

export async function sendAuctionApprovedEmail(
  email: string,
  auctionTitle: string,
  auctionId: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'auction_approved',
    vars: {
      user_name: 'Utilizator',
      listing_title: auctionTitle,
      auction_link: `${DEFAULT_SITE_URL}/auctions/${auctionId}`,
      action_link: `${DEFAULT_SITE_URL}/auctions/${auctionId}`,
    },
    fallbackKey: 'fallback_default',
  });
}

export async function sendAuctionRejectedEmail(
  email: string,
  auctionTitle: string,
  reason: string,
): Promise<void> {
  return sendTemplateEmail({
    to: email,
    templateKey: 'auction_rejected',
    vars: {
      user_name: 'Utilizator',
      listing_title: auctionTitle,
      event_message: reason,
      action_link: `${DEFAULT_SITE_URL}/dashboard`,
    },
    fallbackKey: 'fallback_default',
  });
}

export default {
  sendTemplateEmail,
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
};

