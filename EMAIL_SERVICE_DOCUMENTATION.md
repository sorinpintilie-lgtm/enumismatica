# Email Service Documentation

## Overview

The E-Numismatica.ro platform uses AWS SES (Simple Email Service) to send transactional emails to users for various operations including account management, auction activities, product transactions, and administrative notifications.

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` (web) or `.env` (mobile):

```env
# AWS SES Configuration
AWS_SES_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
SES_FROM_EMAIL=contact@enumismatica.ro

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://enumismatica.ro
```

### AWS SES Setup

1. **Verify Email Address**: The sender email (`contact@enumismatica.ro`) must be verified in AWS SES
2. **Production Access**: Request production access from AWS to send emails to any recipient
3. **Region**: Currently configured for `eu-north-1` (Stockholm)

## Email Templates

The email service includes professionally designed templates for all operations:

### Account Management

#### 1. Welcome Email
- **Function**: `sendWelcomeEmail(email, displayName)`
- **Trigger**: New user registration
- **Content**: Welcome message, platform features overview, call-to-action to explore auctions

#### 2. Password Reset
- **Function**: `sendPasswordResetEmail(email, resetLink)`
- **Trigger**: User requests password reset
- **Content**: Reset link (valid for 1 hour), security notice

#### 3. Account Blocked
- **Function**: `sendAccountBlockedEmail(email, reason)`
- **Trigger**: Admin blocks user account
- **Content**: Block reason, contact support link

### Event Management

#### 4. Event Confirmation
- **Function**: `sendEventConfirmationEmail(email, eventName, eventDetails)`
- **Trigger**: User registers for an event
- **Content**: Event confirmation, event details

### Product Transactions

#### 5. Purchase Confirmation
- **Function**: `sendPurchaseConfirmationEmail(email, productName, price, orderId)`
- **Trigger**: User completes direct product purchase
- **Content**: Order details, order tracking link

#### 6. Product Sold (Seller)
- **Function**: `sendProductSoldEmail(email, productName, price, buyerName)`
- **Trigger**: Seller's product is purchased
- **Content**: Sale confirmation, buyer information, next steps

### Auction Operations

#### 7. Outbid Notification
- **Function**: `sendOutbidEmail(email, auctionTitle, currentBid, auctionId)`
- **Trigger**: User is outbid on an auction
- **Content**: Current bid amount, link to place new bid

#### 8. Auction Won
- **Function**: `sendAuctionWonEmail(email, auctionTitle, finalBid, auctionId)`
- **Trigger**: User wins an auction
- **Content**: Congratulations message, final bid amount, next steps

#### 9. Auction Sold (Seller)
- **Function**: `sendAuctionSoldEmail(email, auctionTitle, finalBid, winnerName, auctionId)`
- **Trigger**: Seller's auction ends successfully
- **Content**: Final bid, winner information, transaction details

### Admin Approvals

#### 10. Product Approved
- **Function**: `sendProductApprovedEmail(email, productName, productId)`
- **Trigger**: Admin approves a product listing
- **Content**: Approval confirmation, link to view product

#### 11. Product Rejected
- **Function**: `sendProductRejectedEmail(email, productName, reason)`
- **Trigger**: Admin rejects a product listing
- **Content**: Rejection reason, guidance for resubmission

#### 12. Auction Approved
- **Function**: `sendAuctionApprovedEmail(email, auctionTitle, auctionId)`
- **Trigger**: Admin approves an auction
- **Content**: Approval confirmation, link to view auction

#### 13. Auction Rejected
- **Function**: `sendAuctionRejectedEmail(email, auctionTitle, reason)`
- **Trigger**: Admin rejects an auction
- **Content**: Rejection reason, guidance for resubmission

## Usage Examples

### In Authentication Flow

```typescript
import { sendWelcomeEmail } from 'shared/emailService';

// After successful registration
await sendWelcomeEmail(user.email, user.displayName);
```

### In Auction Service

```typescript
import { sendOutbidEmail, sendAuctionWonEmail } from 'shared/emailService';

// When user is outbid
await sendOutbidEmail(
  previousBidder.email,
  auction.title,
  newBid.amount,
  auction.id
);

// When auction ends
await sendAuctionWonEmail(
  winner.email,
  auction.title,
  finalBid,
  auction.id
);
```

### In Admin Panel

```typescript
import { sendProductApprovedEmail, sendProductRejectedEmail } from 'shared/emailService';

// Approve product
await sendProductApprovedEmail(
  product.ownerEmail,
  product.name,
  product.id
);

// Reject product
await sendProductRejectedEmail(
  product.ownerEmail,
  product.name,
  'Product images are not clear enough'
);
```

## Email Template Design

All emails follow a consistent design:

- **Header**: Dark blue gradient with gold E-Numismatica.ro logo
- **Content**: Clean white background with clear typography
- **Call-to-Action**: Gold buttons with rounded corners
- **Footer**: Site links, copyright, contact information

### Responsive Design

- Mobile-optimized layout
- Maximum width: 600px
- Readable font sizes
- Touch-friendly buttons

## Error Handling

The email service includes comprehensive error handling:

```typescript
try {
  await sendWelcomeEmail(email, displayName);
} catch (error) {
  console.error('Failed to send welcome email:', error);
  // Email failure should not block the main operation
  // Log error for monitoring
}
```

## Best Practices

1. **Non-Blocking**: Email sending should not block critical operations
2. **Error Logging**: Always log email failures for monitoring
3. **Retry Logic**: Consider implementing retry logic for failed emails
4. **Rate Limiting**: Be aware of AWS SES sending limits
5. **Testing**: Use SES sandbox mode for testing before production

## Monitoring

Monitor email delivery through:

1. **AWS SES Console**: View sending statistics, bounces, complaints
2. **Application Logs**: Track email sending attempts and failures
3. **User Feedback**: Monitor support requests related to missing emails

## Security Considerations

1. **Credentials**: Never commit AWS credentials to version control
2. **Environment Variables**: Use secure environment variable management
3. **Email Validation**: Always validate email addresses before sending
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Unsubscribe**: Consider adding unsubscribe links for marketing emails

## Future Enhancements

- [ ] Email templates in multiple languages (RO/EN)
- [ ] Email preferences management
- [ ] Email delivery tracking
- [ ] Retry mechanism for failed emails
- [ ] Email queue system for high volume
- [ ] A/B testing for email templates
- [ ] Rich email analytics

## Support

For issues with email delivery:

1. Check AWS SES console for bounce/complaint reports
2. Verify sender email is verified in SES
3. Check AWS SES sending limits
4. Review application logs for error messages
5. Contact AWS support for SES-specific issues

## Related Documentation

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Firebase Authentication](./FIREBASE_MIGRATION_SUMMARY.md)
- [Admin System](./ADMIN_SYSTEM_DOCUMENTATION.md)