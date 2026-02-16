# NETOPIA Payments Setup for Credits Purchase

This document describes the NETOPIA integration used for buying credits in the web app.

## Implemented Flow

1. User opens `/credits` and enters amount in RON.
2. Frontend calls `POST /api/payments/netopia/create` with Firebase Bearer token.
3. Server creates a `creditPurchases/{orderId}` record and starts NETOPIA payment.
4. User is redirected to NETOPIA checkout page.
5. NETOPIA calls `POST /api/payments/netopia/webhook`.
6. Webhook validates signature and performs idempotent credit top-up.
7. User returns to `/credits/success?orderId=...` where status is shown via `GET /api/payments/netopia/status`.

## Required Environment Variables (web app)

- `NETOPIA_API_KEY` - API key used in Authorization header for NETOPIA requests.
- `NETOPIA_SIGNATURE` - Merchant POS signature used in create payment payload.
- `NETOPIA_BASE_URL` - NETOPIA API base URL (optional; defaults to `https://secure.netopia-payments.com`).
- `NETOPIA_WEBHOOK_SECRET` - Secret used to validate webhook signature (`x-netopia-signature`).

Also required (already used by the app):

- Firebase Admin credentials (`FIREBASE_SERVICE_ACCOUNT_JSON` or split vars)

## Firestore Collections Used

- `creditPurchases/{orderId}`
  - Tracks payment lifecycle and idempotency (`creditsApplied` flag)
- `users/{uid}`
  - `credits` field is incremented on successful payment
- `users/{uid}/creditTransactions/{txId}`
  - Audit record with `type: purchase_netopia`

## Notes

- Credit conversion is currently `1 credit = 2 RON` (`Math.floor(ron / 2)`).
- Webhook top-up is idempotent: once `creditsApplied === true`, retries do not add credits again.
- If your NETOPIA account uses a different payload schema, adjust the parser in:
  - `web/app/api/payments/netopia/create/route.ts`
  - `web/app/api/payments/netopia/webhook/route.ts`

