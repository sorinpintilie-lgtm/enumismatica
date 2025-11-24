# Deployment Steps for Admin System

## 1. Deploy Firestore Rules

The updated [`firestore.rules`](firestore.rules:1) file MUST be deployed to Firebase Console for the admin system to work properly.

### Option A: Using Firebase CLI (Recommended)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

### Option B: Using Firebase Console (Manual)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **e-numismatica-ro**
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the entire content from [`firestore.rules`](firestore.rules:1)
5. Paste it into the Firebase Console rules editor
6. Click **Publish** button

## 2. Set Up Admin User in Firestore

Your admin account (sorinp3g@gmail.com) needs to exist in the Firestore `users` collection with the admin role.

### Steps:
1. Go to Firebase Console → Firestore Database
2. Navigate to the `users` collection
3. Find or create a document with your user ID (from Firebase Auth)
4. Ensure the document has these fields:
   ```json
   {
     "email": "sorinp3g@gmail.com",
     "displayName": "Your Name",
     "role": "admin",
     "createdAt": <timestamp>,
     "updatedAt": <timestamp>
   }
   ```

**Note**: The system checks BOTH the `role` field AND the hardcoded email, so even if the role field is missing, sorinp3g@gmail.com will still have admin access.

## 3. Verify Deployment

### Check Firestore Rules
1. Go to Firebase Console → Firestore Database → Rules
2. Verify the rules include the `isAdmin()` function
3. Check that the rules were published successfully

### Test Admin Access
1. Login to the web app with sorinp3g@gmail.com
2. You should see an orange "Admin" link in the navigation
3. Click it to access the admin dashboard
4. Verify you can see platform statistics

## 4. Important Security Notes

### Current Rules Include:
- ✅ Admin check function using role OR email
- ✅ Admin-only read access to all users
- ✅ Admin-only write access to product/auction status fields
- ✅ Admin-only delete permissions
- ✅ Approval workflow for products (pending → approved/rejected)
- ✅ Approval workflow for auctions (pending → active/rejected)

### What Regular Users Can Do:
- Read approved products only
- Read active/ended auctions only
- Create products with status: 'pending'
- Create auctions with status: 'pending'
- Cannot change status fields (admin only)

### What Admins Can Do:
- Read ALL products and auctions (any status)
- Change status fields (approve/reject)
- Delete any product or auction
- View all users
- Promote/demote admin roles
- Force end auctions

## 5. Testing Checklist

After deployment, test these scenarios:

### As Admin (sorinp3g@gmail.com):
- [ ] Can access /admin route
- [ ] Can see all products (pending, approved, rejected)
- [ ] Can approve pending products
- [ ] Can reject products
- [ ] Can see all auctions (pending, active, ended, rejected)
- [ ] Can approve pending auctions
- [ ] Can force end active auctions
- [ ] Can view all users
- [ ] Can promote users to admin

### As Regular User:
- [ ] Cannot access /admin route (redirects to dashboard)
- [ ] Can only see approved products
- [ ] Can only see active/ended auctions
- [ ] Can create products (they start as pending)
- [ ] Can create auctions (they start as pending)
- [ ] Cannot see "Admin" link in navigation

## 6. Troubleshooting

### "Permission Denied" Errors
- **Cause**: Firestore rules not deployed or user not marked as admin
- **Fix**: Deploy rules and verify user document has `role: 'admin'`

### Admin Link Not Showing
- **Cause**: User document doesn't have admin role
- **Fix**: Add `role: 'admin'` to user document in Firestore

### Cannot Approve Products/Auctions
- **Cause**: Firestore rules not allowing status changes
- **Fix**: Ensure rules include admin check and allow status field updates

### Products/Auctions Not Visible After Approval
- **Cause**: Frontend filtering or caching issue
- **Fix**: Refresh page or check product/auction status in Firestore

## 7. Firebase Console Quick Links

- **Project**: https://console.firebase.google.com/project/e-numismatica-ro
- **Firestore Database**: https://console.firebase.google.com/project/e-numismatica-ro/firestore
- **Authentication**: https://console.firebase.google.com/project/e-numismatica-ro/authentication
- **Rules**: https://console.firebase.google.com/project/e-numismatica-ro/firestore/rules

## 8. Next Steps After Deployment

1. **Test the approval workflow**:
   - Create a test product as a regular user
   - Login as admin and approve it
   - Verify it appears in the public catalog

2. **Test auction approval**:
   - Create a test auction as a regular user
   - Login as admin and approve it
   - Verify it appears in the auctions list

3. **Test user management**:
   - Create a test user account
   - Login as admin and promote them
   - Verify they can access admin panel

4. **Monitor usage**:
   - Check Firebase Console for any rule violations
   - Review admin actions in Firestore
   - Monitor for any security issues

## Summary

**YOU MUST**:
1. ✅ Deploy the updated [`firestore.rules`](firestore.rules:1) to Firebase
2. ✅ Ensure your user document has `role: 'admin'` in Firestore
3. ✅ Test admin access after deployment

**The system will NOT work properly until the Firestore rules are deployed!**