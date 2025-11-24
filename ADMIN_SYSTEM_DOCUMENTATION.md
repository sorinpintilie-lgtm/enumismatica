# Admin System Documentation

## Overview
Complete admin system for managing the E-numismatica platform with approval-based workflows for products and auctions.

## Admin Account
- **Email**: sorinp3g@gmail.com
- **Role**: Super Admin (hardcoded in system)
- **Access**: Full platform management capabilities

## Features Implemented

### 1. User Management
- **Role System**: Users can be 'admin' or 'user' (default)
- **Admin Detection**: Checks both role field and hardcoded admin email
- **User Operations**:
  - View all users
  - Promote users to admin
  - Demote admins to regular users
  - Delete user accounts (Firestore only, not Firebase Auth)

### 2. Product Management
- **Approval Workflow**: All products require admin approval
- **Product States**:
  - `pending`: Awaiting admin review
  - `approved`: Visible to all users
  - `rejected`: Hidden from public, can be re-approved
- **Admin Operations**:
  - View all products (any status)
  - Approve pending products
  - Reject products
  - Delete products
  - Filter by status

### 3. Auction Management
- **Approval Workflow**: All auctions require admin approval
- **Auction States**:
  - `pending`: Awaiting admin review
  - `active`: Live and accepting bids
  - `ended`: Auction completed
  - `cancelled`: Cancelled by admin
  - `rejected`: Rejected by admin
- **Admin Operations**:
  - View all auctions (any status)
  - Approve pending auctions (changes to active)
  - Reject auctions
  - Force end active auctions
  - Delete auctions
  - Filter by status

### 4. Platform Statistics
- Total users count
- Total products count
- Total auctions count
- Active auctions count
- Ended auctions count

## File Structure

### Shared Module
- **`shared/types.ts`**: Updated with role and status fields
- **`shared/adminService.ts`**: All admin functions (253 lines)
  - User management functions
  - Product management functions
  - Auction management functions
  - Approval/rejection functions
  - Statistics functions

### Web Application
- **`web/app/admin/page.tsx`**: Main admin dashboard
- **`web/app/admin/products/page.tsx`**: Product management page
- **`web/app/admin/auctions/page.tsx`**: Auction management page
- **`web/app/admin/users/page.tsx`**: User management page
- **`web/app/components/Navigation.tsx`**: Updated with admin link

### Security
- **`firestore.rules`**: Updated with admin-specific rules
  - Admin check function using role or email
  - Admin-only read access to all data
  - Admin-only write access to status fields
  - Admin-only delete permissions

## Admin Functions

### User Management
```typescript
isAdmin(userId: string): Promise<boolean>
setUserAsAdmin(userId: string, isCurrentUserAdmin: boolean)
removeAdminRole(userId: string, isCurrentUserAdmin: boolean)
getAllUsers(): Promise<User[]>
deleteUser(userId: string)
```

### Product Management
```typescript
getAllProducts(): Promise<Product[]>
getPendingProducts(): Promise<Product[]>
getRejectedProducts(): Promise<Product[]>
approveProduct(productId: string)
rejectProduct(productId: string)
deleteProduct(productId: string)
createProduct(productData: Omit<Product, 'id'>)
updateProduct(productId: string, updates: Partial<Product>)
```

### Auction Management
```typescript
getAllAuctions(): Promise<Auction[]>
getPendingAuctions(): Promise<Auction[]>
getRejectedAuctions(): Promise<Auction[]>
approveAuction(auctionId: string)
rejectAuction(auctionId: string)
deleteAuction(auctionId: string)
forceEndAuction(auctionId: string)
createAuction(auctionData: Omit<Auction, 'id'>)
updateAuctionStatus(auctionId: string, status: string)
```

### Statistics
```typescript
getPlatformStats(): Promise<{
  totalUsers: number;
  totalProducts: number;
  totalAuctions: number;
  activeAuctions: number;
  endedAuctions: number;
}>
```

## Access Control

### Navigation
- Admin link appears in navigation only for admin users
- Orange color to distinguish from regular links
- Automatically checks admin status on component mount

### Route Protection
All admin pages check:
1. User is authenticated
2. User has admin role or is the super admin email
3. Redirects to login if not authenticated
4. Redirects to dashboard if not admin

### Firestore Rules
```javascript
function isAdmin() {
  return isAuthenticated() && 
         (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email == 'sorinp3g@gmail.com');
}
```

## User Workflows

### Regular User Creating Product
1. User creates product with status: 'pending'
2. Product is hidden from public catalog
3. Admin reviews in admin panel
4. Admin approves → status: 'approved' → visible to all
5. OR Admin rejects → status: 'rejected' → hidden

### Regular User Creating Auction
1. User creates auction with status: 'pending'
2. Auction is hidden from public listings
3. Admin reviews in admin panel
4. Admin approves → status: 'active' → live bidding
5. OR Admin rejects → status: 'rejected' → hidden

### Admin Managing Platform
1. Login with admin account (sorinp3g@gmail.com)
2. Click "Admin" link in navigation
3. View dashboard with statistics
4. Navigate to Products/Auctions/Users tabs
5. Perform management actions

## UI Features

### Admin Dashboard
- **Overview Tab**: Platform statistics and quick actions
- **Pending Products Tab**: Review and approve/reject products
- **Pending Auctions Tab**: Review and approve/reject auctions
- **Real-time counts**: Shows pending items count in tab labels

### Product Management Page
- Filter tabs: All, Pending, Approved, Rejected
- Approve/Reject buttons for pending items
- Delete button for all items
- Re-approve option for rejected items

### Auction Management Page
- Filter tabs: All, Pending, Active, Ended, Rejected
- Approve/Reject buttons for pending items
- Force End button for active auctions
- Delete button for all items

### User Management Page
- List all users with roles
- Make Admin / Remove Admin buttons
- Delete user button
- Super Admin badge for sorinp3g@gmail.com
- Cannot modify super admin account

## Testing Checklist

### Setup
- [x] Admin account exists in Firestore users collection
- [x] Admin account has role: 'admin' OR email: 'sorinp3g@gmail.com'

### Navigation
- [ ] Admin link appears for admin users
- [ ] Admin link does not appear for regular users
- [ ] Admin link redirects to /admin

### Admin Dashboard
- [ ] Shows correct statistics
- [ ] Pending counts are accurate
- [ ] Tabs switch correctly
- [ ] Approve/Reject buttons work

### Product Management
- [ ] Can view all products
- [ ] Can filter by status
- [ ] Can approve pending products
- [ ] Can reject products
- [ ] Can delete products
- [ ] Approved products appear in public catalog

### Auction Management
- [ ] Can view all auctions
- [ ] Can filter by status
- [ ] Can approve pending auctions
- [ ] Can reject auctions
- [ ] Can force end active auctions
- [ ] Can delete auctions
- [ ] Approved auctions appear in public listings

### User Management
- [ ] Can view all users
- [ ] Can promote users to admin
- [ ] Can demote admins to users
- [ ] Cannot modify super admin
- [ ] Can delete users

### Security
- [ ] Non-admin users cannot access /admin routes
- [ ] Firestore rules prevent unauthorized access
- [ ] Status changes require admin role

## Next Steps

1. **Deploy Firestore Rules**: Upload updated rules to Firebase Console
2. **Set Admin Role**: Ensure sorinp3g@gmail.com user document has role: 'admin'
3. **Test Workflows**: Create test products/auctions and approve them
4. **Mobile Support**: Implement admin features in mobile app if needed
5. **Notifications**: Add email notifications for approval/rejection
6. **Audit Log**: Track admin actions for accountability

## Important Notes

- Super admin email (sorinp3g@gmail.com) is hardcoded and cannot be changed via UI
- Deleting a user only removes Firestore document, not Firebase Auth account
- All products/auctions start as 'pending' and require approval
- Approved items are immediately visible to all users
- Rejected items can be re-approved by admin