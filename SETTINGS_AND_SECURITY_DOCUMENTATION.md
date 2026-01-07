# Settings and Security Features Documentation

## Overview

This document describes the comprehensive settings and security features implemented for the eNumismatica platform, including password management, two-factor authentication (2FA), email preferences, security logging, and account management.

## Features Implemented

### 1. Settings Page (`/settings`)

A comprehensive settings page accessible from the dashboard that provides users with full control over their account security and preferences.

**Location**: `web/app/settings/page.tsx`

**Features**:
- Password change functionality
- Two-factor authentication (2FA) setup and management
- Email notification preferences
- Security activity log
- Account deletion

### 2. Password Management

#### Password Change
Users can change their password from the settings page with the following security measures:

**Requirements**:
- Current password verification (reauthentication)
- New password must be at least 6 characters
- Password confirmation to prevent typos
- Email notification sent after successful change

**Implementation**:
```typescript
// Uses Firebase Authentication
await reauthenticateWithCredential(auth.currentUser, credential);
await updatePassword(auth.currentUser, newPassword);
```

#### Password Reset
Users can reset their password from the login page if they forget it.

**Features**:
- "Ai uitat parola?" button on login page
- Modal dialog for email entry
- Firebase password reset email sent
- Success/error feedback

**Implementation**:
```typescript
await sendPasswordResetEmail(auth, resetEmail);
```

### 3. Two-Factor Authentication (2FA)

Complete 2FA implementation using TOTP (Time-based One-Time Password) compatible with Google Authenticator, Authy, and other authenticator apps.

#### Setup Process
1. User clicks "Activează 2FA" button
2. System generates a secret key and QR code
3. User scans QR code with authenticator app
4. User enters verification code to confirm setup
5. 2FA is enabled and saved to user profile

#### API Endpoints

**Setup 2FA**: `POST /api/auth/2fa/setup`
```typescript
// Generates secret and QR code
{
  secret: string,
  qrCode: string (data URL)
}
```

**Verify 2FA**: `POST /api/auth/2fa/verify`
```typescript
// Verifies TOTP code
{
  userId: string,
  code: string,
  secret: string
}
```

#### Security Features
- Secret stored encrypted in Firestore
- Email notification on enable/disable
- Security log entry created
- Window of 2 time steps for clock drift tolerance

#### Dependencies
```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "@types/speakeasy": "^2.0.10",
  "@types/qrcode": "^1.5.5"
}
```

### 4. Email Notification Preferences

Users can control which types of emails they receive:

**Preference Types**:
- **Marketing**: Promotional emails and offers
- **Auctions**: Auction-related notifications (bids, wins, etc.)
- **Messages**: New message notifications
- **Purchases**: Purchase and sale confirmations
- **Security**: Security alerts (recommended, always enabled)

**Storage**: Saved in user document under `emailNotifications` field

**Implementation**:
```typescript
emailNotifications: {
  marketing: boolean,
  auctions: boolean,
  messages: boolean,
  purchases: boolean,
  security: boolean
}
```

### 5. Security Activity Log

Tracks important security events for user accounts.

**Logged Events**:
- Password changes
- 2FA enabled/disabled
- Login attempts (future enhancement)
- Account modifications

**Data Structure**:
```typescript
{
  userId: string,
  action: string,
  description: string,
  timestamp: Timestamp,
  ipAddress: string (future enhancement)
}
```

**Display**: Shows last 10 security events in settings page

### 6. Account Deletion

Secure account deletion with confirmation process.

**Process**:
1. User clicks "Șterge Contul" button
2. Confirmation dialog appears
3. User must type "ȘTERGE CONTUL" to confirm
4. System deletes all user data:
   - User document
   - Products
   - Auctions
   - Messages
   - Collection items
5. Firebase Auth account deleted
6. User signed out and redirected

**API Endpoint**: `POST /api/auth/delete-account`

**Security**: Requires exact text match to prevent accidental deletion

### 7. Email Notifications

New email templates added for security events:

#### Password Changed
- **Template Key**: `account_password_changed`
- **Sent When**: Password successfully changed
- **Purpose**: Alert user of password change

#### 2FA Enabled
- **Template Key**: `account_2fa_enabled`
- **Sent When**: 2FA successfully enabled
- **Purpose**: Confirm 2FA activation

#### 2FA Disabled
- **Template Key**: `account_2fa_disabled`
- **Sent When**: 2FA disabled
- **Purpose**: Alert user of 2FA deactivation

#### Password Reset
- **Template Key**: `account_password_reset_requested`
- **Sent When**: User requests password reset
- **Purpose**: Provide reset link

**Email Service Functions**:
```typescript
// In shared/emailService.ts
sendPasswordChangedEmail(email: string)
send2FAEnabledEmail(email: string)
send2FADisabledEmail(email: string)
sendPasswordResetEmail(email: string, resetLink: string)
```

## User Interface

### Dashboard Integration

A new "⚙️ Setări" button has been added to the Quick Actions section of the dashboard:

```tsx
<Link href="/settings" className="bg-navy-900 hover:bg-navy-800 text-gold-300 border-2 border-gold-400 px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg">
  ⚙️ Setări
</Link>
```

### Settings Page Layout

The settings page is organized into sections:

1. **Password Change Section**
   - Current password input
   - New password input
   - Confirm password input
   - Submit button

2. **2FA Section**
   - Status indicator (enabled/disabled)
   - Setup wizard with QR code
   - Verification code input
   - Enable/disable buttons

3. **Email Preferences Section**
   - Toggle switches for each notification type
   - Save button

4. **Security Log Section**
   - List of recent security events
   - Timestamps and descriptions

5. **Danger Zone Section**
   - Account deletion with confirmation
   - Red-themed warning design

### Design System

**Colors**:
- Primary: Gold (#e7b73c)
- Background: Navy gradients
- Success: Emerald
- Error: Red
- Warning: Yellow

**Components**:
- Rounded corners (rounded-xl, rounded-2xl)
- Backdrop blur effects
- Shadow effects for depth
- Smooth transitions

## Security Considerations

### Password Security
- Minimum 6 characters (Firebase requirement)
- Reauthentication required before change
- Email notification on change
- Security log entry created

### 2FA Security
- TOTP standard (RFC 6238)
- 32-character secret length
- Base32 encoding
- 2-step window for clock drift
- Secret stored securely in Firestore

### Account Deletion
- Requires exact text confirmation
- Cascading deletion of all user data
- Irreversible action
- Immediate sign-out

### Email Security
- All security events trigger email notifications
- Users alerted to unauthorized changes
- Contact link provided for suspicious activity

## Firebase Admin Setup

For server-side operations (account deletion), Firebase Admin SDK is used:

**File**: `web/app/lib/firebaseAdmin.ts`

**Environment Variables Required**:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
```

**Usage**:
```typescript
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
```

## Testing Checklist

### Password Change
- [ ] Can change password with correct current password
- [ ] Cannot change with incorrect current password
- [ ] Password must match confirmation
- [ ] Email notification received
- [ ] Security log entry created

### Password Reset
- [ ] Modal opens from login page
- [ ] Email sent with reset link
- [ ] Invalid email shows error
- [ ] Success message displayed
- [ ] Modal closes after success

### 2FA Setup
- [ ] QR code generated correctly
- [ ] Secret displayed for manual entry
- [ ] Verification code accepted
- [ ] 2FA enabled in user profile
- [ ] Email notification received
- [ ] Security log entry created

### 2FA Disable
- [ ] Confirmation dialog appears
- [ ] 2FA disabled successfully
- [ ] Email notification received
- [ ] Security log entry created

### Email Preferences
- [ ] All toggles work correctly
- [ ] Preferences saved to Firestore
- [ ] Success message displayed
- [ ] Preferences persist on reload

### Security Log
- [ ] Events displayed correctly
- [ ] Timestamps formatted properly
- [ ] Most recent events shown first
- [ ] Limited to 10 entries

### Account Deletion
- [ ] Confirmation dialog appears
- [ ] Requires exact text match
- [ ] All user data deleted
- [ ] Auth account deleted
- [ ] User signed out
- [ ] Redirected to home page

## Future Enhancements

### Planned Features
1. **Login History**: Track all login attempts with IP addresses and locations
2. **Session Management**: View and revoke active sessions
3. **Backup Codes**: Generate backup codes for 2FA recovery
4. **Email Verification**: Require email verification for new accounts
5. **Phone Number**: Add phone number for SMS 2FA option
6. **Security Questions**: Additional recovery method
7. **Export Data**: GDPR compliance - allow users to export their data
8. **Account Suspension**: Temporary account deactivation option

### Technical Improvements
1. **Rate Limiting**: Prevent brute force attacks on 2FA
2. **IP Tracking**: Log IP addresses for security events
3. **Geolocation**: Show login locations on security log
4. **Device Fingerprinting**: Recognize trusted devices
5. **Anomaly Detection**: Alert on suspicious activity patterns

## API Reference

### 2FA Setup
```typescript
POST /api/auth/2fa/setup
Body: { userId: string }
Response: { secret: string, qrCode: string }
```

### 2FA Verify
```typescript
POST /api/auth/2fa/verify
Body: { userId: string, code: string, secret: string }
Response: { success: boolean }
```

### Delete Account
```typescript
POST /api/auth/delete-account
Body: { userId: string }
Response: { success: boolean }
```

## Firestore Schema Updates

### Users Collection
```typescript
{
  // Existing fields...
  twoFactorEnabled: boolean,
  twoFactorSecret: string | null,
  emailNotifications: {
    marketing: boolean,
    auctions: boolean,
    messages: boolean,
    purchases: boolean,
    security: boolean
  },
  updatedAt: Timestamp
}
```

### Security Logs Collection
```typescript
{
  userId: string,
  action: string,
  description: string,
  timestamp: Timestamp,
  ipAddress: string
}
```

**Indexes Required**:
- `userId` + `timestamp` (descending)

## Troubleshooting

### 2FA Not Working
1. Check system time is synchronized
2. Verify secret is correctly stored
3. Try codes from different time windows
4. Regenerate secret if needed

### Email Not Received
1. Check spam folder
2. Verify email service configuration
3. Check SendGrid API key
4. Review email service logs

### Account Deletion Fails
1. Check Firebase Admin credentials
2. Verify user has permission
3. Check for active auctions/orders
4. Review server logs

## Support

For issues or questions:
- Email: support@enumismatica.ro
- Documentation: See this file
- Admin Panel: Contact system administrator

## Changelog

### Version 1.0.0 (2026-01-07)
- Initial implementation of settings page
- Password change functionality
- Two-factor authentication (2FA)
- Email notification preferences
- Security activity log
- Account deletion
- Password reset from login page
- Email notifications for security events
- Dashboard integration with Settings button

---

**Last Updated**: 2026-01-07
**Author**: Development Team
**Status**: Production Ready
