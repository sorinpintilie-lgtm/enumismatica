# Admin Controls & Monitoring System Documentation

## Overview

This document describes the comprehensive admin control and monitoring system implemented for the E-numismatica.ro platform. The system provides complete visibility and control over all user activities, with detailed logging, real-time monitoring, and powerful administrative tools.

## Features Implemented

### 1. User Activity Logging Service (`shared/activityLogService.ts`)

**Comprehensive event tracking system that logs every user action on the platform.**

#### Event Types Tracked:
- **Authentication Events**: login, logout, register, password reset, email verification
- **Navigation Events**: page views, page leaves
- **Product Events**: view, search, filter, create, update, delete
- **Auction Events**: view, create, bid, auto-bid operations, auction end, wins
- **Collection Events**: add, remove, view items
- **Chat Events**: message send/read, conversation start
- **Admin Events**: all administrative actions
- **Error Events**: system errors, API errors, payment errors
- **Security Events**: suspicious activity, rate limiting, unauthorized access attempts

#### Data Captured:
- User identification (ID, email, name)
- Event type and timestamp
- Session ID for tracking user sessions
- Device information (browser, OS, device type)
- Screen resolution
- Page URL and referrer
- IP address (when available)
- Custom metadata for each event type
- Admin action flag

#### Key Functions:
```typescript
logActivity(userId, eventType, metadata, userEmail, userName, isAdmin)
getActivityLogs(filter)
subscribeToActivityLogs(filter, callback)
getUserActivityStats(userId)
searchActivityLogs(searchTerm, filter)
```

### 2. Admin Activity Logs Viewer (`web/app/admin/activity-logs/page.tsx`)

**Real-time dashboard for monitoring all user activity.**

#### Features:
- Real-time activity feed with live updates
- Advanced filtering by:
  - Event category (Authentication, Navigation, Products, Auctions, etc.)
  - User ID
  - Date range
  - Search across all metadata
- Statistics dashboard showing:
  - Total events
  - Unique users
  - Admin actions count
  - Errors and alerts count
- Expandable log entries showing complete metadata
- Color-coded event types for quick identification
- Session tracking

### 3. Admin Control Service (`shared/adminControlService.ts`)

**Powerful administrative tools for user management.**

#### Available Controls:

**Password Reset**
```typescript
adminResetUserPassword(targetUserId, targetUserEmail, adminUserId, adminEmail, reason)
```
- Sends password reset email to user
- Logs the action with reason
- Records in admin audit trail

**User Ban/Unban**
```typescript
banUser(targetUserId, adminUserId, adminEmail, reason)
unbanUser(targetUserId, adminUserId, adminEmail, reason)
```
- Prevents user login and access
- Requires reason for action
- Fully reversible
- Logged in audit trail

**Role Management**
```typescript
changeUserRole(targetUserId, newRole, adminUserId, adminEmail, reason)
```
- Change between 'admin' and 'user' roles
- Tracks previous and new role
- Requires justification

**Credits Management**
```typescript
updateUserCredits(targetUserId, newCredits, adminUserId, adminEmail, reason)
```
- Modify user credit balance
- Tracks old and new values
- Requires reason for adjustment

**Force Logout**
```typescript
forceLogoutUser(targetUserId, adminUserId, adminEmail, reason)
```
- Invalidates user session
- Forces re-authentication on next request

**Account Deletion**
```typescript
deleteUserAccount(targetUserId, adminUserId, adminEmail, reason)
```
- Soft delete (marks as deleted, doesn't remove data)
- Preserves data for audit purposes
- Requires strong justification

### 4. Enhanced User Management Page (`web/app/admin/users/[id]/page.tsx`)

**Comprehensive user profile with full admin controls.**

#### Tabs:
1. **Overview**: User statistics and analytics
2. **Collection**: User's personal coin collection
3. **Messages**: All user conversations
4. **Activity**: Recent user activity and statistics
5. **Controls**: Admin action panel

#### Admin Controls Panel:
- Password Reset
- Ban/Unban User
- Change Role (Admin/User)
- Update Credits
- Force Logout
- Delete Account

All actions require:
- Reason/justification
- Admin confirmation
- Automatic logging

#### Activity Monitoring:
- Total events count
- Session count
- Last activity timestamp
- Event breakdown by type
- Recent activity feed

### 5. Real-time Admin Dashboard (`web/app/admin/page.tsx`)

**Central command center for platform monitoring.**

#### Features:
- Live activity feed with real-time updates
- Platform statistics:
  - Total users (active/inactive)
  - Total products
  - Active auctions
  - Total bids
- Quick access to all admin sections
- Security alerts panel
- Error monitoring
- Suspicious activity detection

#### Real-time Monitoring:
- Toggle between live and paused modes
- Automatic updates every few seconds
- Color-coded events by severity
- Expandable event details

### 6. Admin Audit Trail (`web/app/admin/audit-trail/page.tsx`)

**Complete history of all administrative actions.**

#### Tracked Actions:
- User bans/unbans
- Password resets
- Role changes
- Credit adjustments
- Account deletions
- Force logouts

#### Information Recorded:
- Action type
- Target user
- Performing admin
- Timestamp
- Reason/justification
- Before/after values (for changes)
- Complete metadata

#### Features:
- Searchable and filterable
- Statistics by action type
- Expandable details
- Export capability (future enhancement)

### 7. Admin Notification System (`shared/adminNotificationService.ts`)

**Alert system for critical events.**

#### Notification Types:
- Suspicious activity
- Rate limit exceeded
- Unauthorized access attempts
- Multiple failed logins
- Admin action required
- System errors
- High-value transactions
- User bans
- Mass deletions
- Security breach attempts

#### Severity Levels:
- **Critical**: Immediate action required
- **Security**: Security-related events
- **Warning**: Potential issues
- **Info**: Informational notifications

#### Features:
```typescript
createAdminNotification(type, severity, title, message, metadata)
getAdminNotifications(filters)
subscribeToAdminNotifications(callback, filters)
markNotificationAsRead(notificationId)
markNotificationActionTaken(notificationId, adminUserId)
```

#### Helper Functions:
- `notifySuspiciousActivity()`
- `notifyFailedLogins()`
- `notifyUnauthorizedAccess()`
- `notifySystemError()`

### 8. Admin Notifications Page (`web/app/admin/notifications/page.tsx`)

**Notification center for admins.**

#### Features:
- Real-time notification feed
- Filter by severity
- Show unread only option
- Mark as read/resolved
- Link to related users
- Statistics dashboard
- Expandable metadata

### 9. Updated Firestore Security Rules

**Enhanced security rules for admin features.**

#### New Collections:
```
activityLogs/
  - Read: Admins only
  - Create: Authenticated users (own logs)
  - Update/Delete: Admins only

adminActions/
  - Read: Admins only
  - Create: Admins only
  - Update/Delete: Admins only

adminNotifications/
  - Read: Admins only
  - Create: Authenticated (system-generated)
  - Update: Admins only (read/action status)
  - Delete: Admins only
```

### 10. Enhanced Auth Context (`web/app/context/AuthContext.tsx`)

**Extended user object with admin status.**

#### Features:
- Fetches user role from Firestore
- Adds `isAdmin` boolean flag
- Adds `role` field ('admin' | 'user')
- Automatic role checking on auth state change

## Usage Examples

### Logging User Activity

```typescript
import { logActivity } from 'shared/activityLogService';

// Log a page view
await logActivity(
  userId,
  'page_view',
  { page: '/products', referrer: document.referrer },
  userEmail,
  userName
);

// Log an admin action
await logActivity(
  adminId,
  'admin_user_ban',
  { targetUserId, reason: 'Spam' },
  adminEmail,
  adminName,
  true // isAdmin flag
);
```

### Admin Controls

```typescript
import { banUser, adminResetUserPassword } from 'shared/adminControlService';

// Ban a user
await banUser(
  targetUserId,
  adminUserId,
  adminEmail,
  'Repeated policy violations'
);

// Reset password
await adminResetUserPassword(
  targetUserId,
  targetUserEmail,
  adminUserId,
  adminEmail,
  'User requested password reset'
);
```

### Creating Notifications

```typescript
import { notifySuspiciousActivity } from 'shared/adminNotificationService';

// Notify about suspicious activity
await notifySuspiciousActivity(
  userId,
  userEmail,
  'Multiple failed login attempts',
  { attemptCount: 5, ipAddress: '192.168.1.1' }
);
```

## Admin Pages

### Available Routes:
- `/admin` - Main dashboard
- `/admin/users` - User management
- `/admin/users/[id]` - User detail with controls
- `/admin/activity-logs` - Activity monitoring
- `/admin/audit-trail` - Admin action history
- `/admin/notifications` - Notification center
- `/admin/products` - Product management
- `/admin/auctions` - Auction management
- `/admin/conversations` - Message monitoring

## Security Considerations

1. **All admin actions are logged** - Complete audit trail
2. **Reason required** - All significant actions require justification
3. **Role-based access** - Only admins can access admin features
4. **Firestore rules** - Server-side security enforcement
5. **Soft deletes** - Data preserved for audit purposes
6. **Session tracking** - Monitor user sessions
7. **Real-time monitoring** - Immediate visibility of suspicious activity

## Best Practices

1. **Always provide clear reasons** for admin actions
2. **Review activity logs regularly** for suspicious patterns
3. **Monitor notifications** for critical events
4. **Use audit trail** to track admin actions
5. **Enable real-time monitoring** during active hours
6. **Document significant actions** in external systems if needed
7. **Regular security reviews** of activity logs

## Future Enhancements

- Export functionality for logs and audit trails
- Advanced analytics and reporting
- Automated response to suspicious activity
- Machine learning for anomaly detection
- Email notifications for critical events
- Mobile admin app
- Bulk user operations
- Advanced search and filtering
- Custom alert rules
- Integration with external monitoring tools

## Support

For questions or issues with the admin system, contact the development team or refer to the main project documentation.