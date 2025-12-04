# Email Service Setup Guide

## ⚠️ IMPORTANT: AWS Credentials Security

**NEVER commit actual AWS credentials to version control!**

The `.env.example` files contain placeholders. You must create actual `.env.local` (web) and `.env` (mobile) files with your real credentials.

## Step 1: Configure AWS SES

### 1.1 Verify Sender Email

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Navigate to "Verified identities"
3. Click "Create identity"
4. Select "Email address"
5. Enter: `contact@enumismatica.ro`
6. Click "Create identity"
7. Check the email inbox and click the verification link

### 1.2 Request Production Access

By default, AWS SES is in sandbox mode (can only send to verified emails).

1. In AWS SES Console, go to "Account dashboard"
2. Click "Request production access"
3. Fill out the form:
   - **Mail type**: Transactional
   - **Website URL**: https://enumismatica.ro
   - **Use case description**: "Transactional emails for numismatic auction platform including account notifications, auction updates, and purchase confirmations"
   - **Compliance**: Confirm you have opt-out mechanism
4. Submit request (usually approved within 24 hours)

### 1.3 Create NEW IAM User for SES

**IMPORTANT**: The credentials you previously had are compromised/reserved. You MUST create NEW credentials.

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Username: `enumismatica-ses-sender-2024` (use a unique name)
4. Click "Next"
5. Select "Attach policies directly"
6. Search and select: `AmazonSESFullAccess`
7. Click "Next" → "Create user"
8. Click on the created user
9. Go to "Security credentials" tab
10. Click "Create access key"
11. Select "Application running outside AWS"
12. Click "Next" → "Create access key"
13. **IMPORTANT**: Copy the NEW Access Key ID and Secret Access Key immediately
14. **NEVER share these credentials** or commit them to git

### 1.4 Delete Old/Compromised Credentials

If you have old IAM users with exposed credentials:

1. Go to IAM Console → Users
2. Find the old user
3. Go to "Security credentials"
4. Click "Make inactive" or "Delete" on old access keys
5. Or delete the entire old user if no longer needed

## Step 2: Configure Environment Variables

### 2.1 Web Application

Create `web/.env.local` file (this file is gitignored):

```env
# Firebase Configuration (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBbIZjstBI9an8Qnff6MEdraZErMzVjw1M
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-numismatica-ro.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-numismatica-ro
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-numismatica-ro.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=686515512350
NEXT_PUBLIC_FIREBASE_APP_ID=1:686515512350:web:c281556b58e08bcb167a0f
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-4BBCPEDX0G

# AWS SES Configuration
AWS_SES_REGION=eu-north-1
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID_FROM_STEP_1.3>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY_FROM_STEP_1.3>
SES_FROM_EMAIL=contact@enumismatica.ro

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://enumismatica.ro
```

### 2.2 Mobile Application

Create `mobile/.env` file (this file is gitignored):

```env
# Firebase Configuration (already configured)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBbIZjstBI9an8Qnff6MEdraZErMzVjw1M
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=e-numismatica-ro.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=e-numismatica-ro
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=e-numismatica-ro.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=686515512350
EXPO_PUBLIC_FIREBASE_APP_ID=1:686515512350:web:c281556b58e08bcb167a0f
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-4BBCPEDX0G

# AWS SES Configuration
AWS_SES_REGION=eu-north-1
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID_FROM_STEP_1.3>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY_FROM_STEP_1.3>
SES_FROM_EMAIL=contact@enumismatica.ro

# Site Configuration
EXPO_PUBLIC_SITE_URL=https://enumismatica.ro
```

## Step 3: Test Email Service

### 3.1 Test in Development

Create a test script `shared/test-email.ts`:

```typescript
import { sendWelcomeEmail } from './emailService';

async function testEmail() {
  try {
    await sendWelcomeEmail('your-test-email@example.com', 'Test User');
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
}

testEmail();
```

Run the test:
```bash
cd shared
npx ts-node test-email.ts
```

### 3.2 Verify Email Delivery

1. Check your test email inbox
2. Verify the email arrived
3. Check email formatting and links
4. Test on mobile devices

### 3.3 Monitor in AWS Console

1. Go to AWS SES Console
2. Check "Sending statistics" for delivery metrics
3. Monitor "Reputation metrics" for bounces/complaints

## Step 4: Production Deployment

### 4.1 Netlify Configuration (Web)

1. Go to Netlify dashboard
2. Select your site
3. Go to "Site settings" → "Environment variables"
4. Add the following variables:
   - `AWS_SES_REGION`: `eu-north-1`
   - `AWS_ACCESS_KEY_ID`: `<your_access_key>`
   - `AWS_SECRET_ACCESS_KEY`: `<your_secret_key>`
   - `SES_FROM_EMAIL`: `contact@enumismatica.ro`
   - `NEXT_PUBLIC_SITE_URL`: `https://enumismatica.ro`

### 4.2 Expo/EAS Configuration (Mobile)

Add secrets to EAS:
```bash
cd mobile
eas secret:create --scope project --name AWS_ACCESS_KEY_ID --value <your_access_key>
eas secret:create --scope project --name AWS_SECRET_ACCESS_KEY --value <your_secret_key>
eas secret:create --scope project --name AWS_SES_REGION --value eu-north-1
eas secret:create --scope project --name SES_FROM_EMAIL --value contact@enumismatica.ro
```

## Step 5: Email Templates Customization

All email templates are in [`shared/emailService.ts`](shared/emailService.ts:1).

To customize:

1. Edit the HTML template in the `emailTemplate()` function
2. Modify individual email content in each `send*Email()` function
3. Add your logo URL to the header
4. Adjust colors to match your brand

## Troubleshooting

### Email Not Sending

1. **Check AWS SES Status**: Verify sender email is verified
2. **Check Credentials**: Ensure AWS credentials are correct
3. **Check Logs**: Look for error messages in application logs
4. **Check SES Limits**: Verify you haven't hit sending limits
5. **Check Region**: Ensure region matches your SES setup

### Email Goes to Spam

1. **SPF Record**: Add SPF record to your domain DNS
2. **DKIM**: Enable DKIM signing in AWS SES
3. **DMARC**: Add DMARC policy to your domain
4. **Content**: Avoid spam trigger words
5. **Reputation**: Monitor bounce and complaint rates

### Production Access Denied

1. **Wait**: AWS usually responds within 24 hours
2. **Resubmit**: Provide more details about your use case
3. **Contact Support**: Open AWS support ticket

## Security Best Practices

1. ✅ **Never commit credentials** to version control
2. ✅ **Use environment variables** for all sensitive data
3. ✅ **Rotate credentials** regularly (every 90 days)
4. ✅ **Use IAM roles** in production when possible
5. ✅ **Monitor usage** for unusual activity
6. ✅ **Implement rate limiting** to prevent abuse
7. ✅ **Log all email operations** for audit trail

## Monitoring & Analytics

### AWS SES Metrics

Monitor these metrics in AWS CloudWatch:

- **Send**: Total emails sent
- **Delivery**: Successfully delivered emails
- **Bounce**: Emails that bounced
- **Complaint**: Spam complaints
- **Reject**: Emails rejected by SES

### Application Metrics

Track in your application:

- Email send attempts
- Email send failures
- Email types sent
- User email preferences
- Unsubscribe requests

## Cost Estimation

AWS SES Pricing (eu-north-1):

- **First 62,000 emails/month**: FREE (if sent from EC2)
- **Additional emails**: $0.10 per 1,000 emails
- **Attachments**: $0.12 per GB

Example monthly costs:
- 1,000 users, 10 emails each = 10,000 emails = **FREE**
- 10,000 users, 10 emails each = 100,000 emails = **~$3.80/month**

## Support

For issues:

1. Check [EMAIL_SERVICE_DOCUMENTATION.md](EMAIL_SERVICE_DOCUMENTATION.md)
2. Review AWS SES documentation
3. Check application logs
4. Contact AWS support for SES-specific issues

## Next Steps

- [ ] Verify sender email in AWS SES
- [ ] Request production access
- [ ] Create IAM user with SES permissions
- [ ] Configure environment variables
- [ ] Test email sending
- [ ] Deploy to production
- [ ] Monitor email delivery metrics
- [ ] Set up SPF/DKIM/DMARC records