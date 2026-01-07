# Security & Account Settings (Web)

This document describes the implemented account/security settings in the web app, the related API routes, and the data model.

## Features implemented

### 1) Password reset (email)

- UI: [`web/app/login/page.tsx`](web/app/login/page.tsx)
- API: [`web/app/api/auth/password-reset/route.ts`](web/app/api/auth/password-reset/route.ts)

Server generates a Firebase password-reset link (Admin SDK) and sends it via SendGrid.

### 2) 2FA (TOTP) + backup codes

- UI: [`web/app/settings/page.tsx`](web/app/settings/page.tsx)
- API:
  - Setup secret: [`web/app/api/auth/2fa/setup/route.ts`](web/app/api/auth/2fa/setup/route.ts)
  - Enable (server verifies TOTP + stores secret privately): [`web/app/api/auth/2fa/enable/route.ts`](web/app/api/auth/2fa/enable/route.ts)
  - Verify at login (server-side verification): [`web/app/api/auth/2fa/verify-login/route.ts`](web/app/api/auth/2fa/verify-login/route.ts)
  - Disable (requires step-up): [`web/app/api/auth/2fa/disable/route.ts`](web/app/api/auth/2fa/disable/route.ts)
  - Backup codes:
    - Generate: [`web/app/api/auth/2fa/backup-codes/generate/route.ts`](web/app/api/auth/2fa/backup-codes/generate/route.ts)
    - Verify: [`web/app/api/auth/2fa/backup-codes/verify/route.ts`](web/app/api/auth/2fa/backup-codes/verify/route.ts)
  - Trusted devices:
    - Add: [`web/app/api/auth/2fa/trusted-devices/add/route.ts`](web/app/api/auth/2fa/trusted-devices/add/route.ts)
    - List: [`web/app/api/auth/2fa/trusted-devices/list/route.ts`](web/app/api/auth/2fa/trusted-devices/list/route.ts)
    - Remove: [`web/app/api/auth/2fa/trusted-devices/remove/route.ts`](web/app/api/auth/2fa/trusted-devices/remove/route.ts)

**Storage**

- Public user flag: `users/{uid}.twoFactorEnabled`
- TOTP secret (server-only): `users/{uid}/privateAuth/2fa.totpSecretBase32`
- Backup codes (hashed, server-only): `users/{uid}/backupCodes/{sha256(code)}`

### 3) Step-up verification for sensitive actions

- UI modal: [`web/app/components/StepUpModal.tsx`](web/app/components/StepUpModal.tsx)
- Token issuance API: [`web/app/api/auth/step-up/issue/route.ts`](web/app/api/auth/step-up/issue/route.ts)
- Server helpers: [`web/app/lib/stepUp.ts`](web/app/lib/stepUp.ts)

Step-up is a **one-time token** (default TTL: 10 minutes) that is required for:

- GDPR export (download): [`web/app/api/account/export/route.ts`](web/app/api/account/export/route.ts)
- Account deletion: [`web/app/api/auth/delete-account/route.ts`](web/app/api/auth/delete-account/route.ts)
- Disable 2FA: [`web/app/api/auth/2fa/disable/route.ts`](web/app/api/auth/2fa/disable/route.ts)
- Email change request: [`web/app/api/account/email-change/request/route.ts`](web/app/api/account/email-change/request/route.ts)
- Account deactivate/reactivate: [`web/app/api/account/deactivate/route.ts`](web/app/api/account/deactivate/route.ts), [`web/app/api/account/reactivate/route.ts`](web/app/api/account/reactivate/route.ts)

### 4) Email change (server confirmation)

- UI: [`web/app/settings/page.tsx`](web/app/settings/page.tsx)
- API:
  - Request (requires step-up): [`web/app/api/account/email-change/request/route.ts`](web/app/api/account/email-change/request/route.ts)
  - Confirm via link: [`web/app/api/account/email-change/confirm/route.ts`](web/app/api/account/email-change/confirm/route.ts)

The server sends a confirmation email to the new address with a signed token stored in Firestore.

### 5) Account deactivation (soft)

- UI: [`web/app/settings/page.tsx`](web/app/settings/page.tsx)
- API:
  - Deactivate (requires step-up): [`web/app/api/account/deactivate/route.ts`](web/app/api/account/deactivate/route.ts)
  - Reactivate (requires step-up): [`web/app/api/account/reactivate/route.ts`](web/app/api/account/reactivate/route.ts)

Effects:

- Sets `users/{uid}.accountStatus = 'deactivated'`.
- Disables listings server-side:
  - Products: `status = 'disabled'`
  - Auctions: `status = 'cancelled'`

### 6) Transaction privacy (banking + shipping)

- UI modal: [`web/app/components/TransactionDetailsModal.tsx`](web/app/components/TransactionDetailsModal.tsx)
- APIs:
  - Buyer can fetch seller IBAN: [`web/app/api/orders/banking-details/route.ts`](web/app/api/orders/banking-details/route.ts)
  - Buyer can share shipping address snapshot: [`web/app/api/orders/share-shipping-address/route.ts`](web/app/api/orders/share-shipping-address/route.ts)
  - Seller can fetch shared shipping address: [`web/app/api/orders/shipping-address/route.ts`](web/app/api/orders/shipping-address/route.ts)

Order fields used:

- `orders/{orderId}.shippingAddressShared` (boolean)
- `orders/{orderId}.shippingAddressSharedAt` (timestamp)
- `orders/{orderId}.shippingAddressSnapshot` (object)

## Firestore rules notes

Sensitive server-managed docs are restricted:

- `users/{uid}/privateAuth/*` (admin only)
- `stepUpTokens/*` (admin only)
- `emailChangeRequests/*` (admin only)

See: [`firestore.rules`](firestore.rules)

