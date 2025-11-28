# Deployment Instructions for Site Assets Feature

## Overview
This document provides step-by-step instructions to deploy the new site assets feature that stores the logo and homepage hero image in Firebase Storage and Firestore.

## What Was Changed

### 1. New Files Created
- `shared/types.ts` - Added `SiteAsset` interface
- `shared/siteAssetService.ts` - Service for managing site assets
- `web/app/hooks/useSiteAsset.ts` - React hook for fetching assets
- `web/app/upload-site-assets/page.tsx` - Admin page for uploading assets
- `SITE_ASSETS_UPLOAD_GUIDE.md` - Comprehensive guide for the feature

### 2. Modified Files
- `web/app/components/Navigation.tsx` - Now fetches logo from database
- `web/app/page.tsx` - Now fetches hero image from database
- `firestore.rules` - Added rules for `siteAssets` collection

## Step-by-Step Deployment

### Step 1: Deploy Firebase Security Rules

**IMPORTANT:** You must deploy both Firestore and Storage rules before uploading assets.

Run these commands from the project root:
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

This will deploy the new security rules that allow:

**Firestore Rules:**
- **Public read access** to all site assets (required for displaying on the website)
- **Admin write access** for creating/updating assets

**Storage Rules:**
- **Public read access** to site-assets folder
- **Admin write access** for uploading images

### Step 2: Upload Site Assets to Firebase

1. **Ensure the development server is running:**
   ```bash
   cd web
   npm run dev
   ```

2. **Navigate to the upload page:**
   Open your browser and go to:
   ```
   http://localhost:3000/upload-site-assets
   ```

3. **Login as admin** (if not already logged in)

4. **Click "Upload Assets to Firebase"** button

5. **Verify the upload:**
   - You should see success messages for both assets
   - Logo: `eNumismatica.ro_logo.png`
   - Homepage Hero: `20-gouden-munt-double-eagle-coronet-head-achterkant-web_big.png`

6. **Check the results:**
   The page will display:
   - Asset ID
   - Type
   - Alt Text
   - Firebase Storage URL

### Step 3: Verify Assets Are Working

1. **Refresh the homepage:**
   ```
   http://localhost:3000
   ```

2. **Check that:**
   - The logo in the navigation is loading from Firebase
   - The hero image on the homepage is loading from Firebase
   - No console errors appear

3. **Check Firebase Console:**
   - Go to Firebase Console → Storage
   - Verify files exist in `site-assets/logo/` and `site-assets/homepage-hero/`
   - Go to Firestore → `siteAssets` collection
   - Verify documents exist with IDs: `logo` and `homepage-hero`

### Step 4: Commit and Push Changes

Once everything is working:

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add site assets management system

- Store logo and hero images in Firebase Storage
- Create siteAssets Firestore collection for metadata
- Add admin upload interface at /upload-site-assets
- Update Navigation and Homepage to fetch from database
- Add Firestore security rules for siteAssets collection
- Include comprehensive documentation"

# Push to repository
git push origin main
```

## Firestore Rules Added

```javascript
// Site Assets collection: Public read, admin write
match /siteAssets/{assetId} {
  allow read: if true; // Public read access for displaying site assets
  allow create, update: if isAdmin() &&
                        hasRequiredFields(request.resource.data, ['name', 'imageUrl', 'altText', 'type', 'active']) &&
                        request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 100 &&
                        request.resource.data.altText.size() > 0 && request.resource.data.altText.size() <= 200 &&
                        request.resource.data.type in ['logo', 'hero', 'banner', 'icon', 'other'];
  allow delete: if isAdmin();
}
```

## Firestore Collection Structure

After upload, you'll have:

```
siteAssets/
  ├── logo
  │   ├── name: "logo"
  │   ├── imageUrl: "https://firebasestorage.googleapis.com/..."
  │   ├── altText: "E-numismatica Logo"
  │   ├── type: "logo"
  │   ├── active: true
  │   └── timestamps...
  │
  └── homepage-hero
      ├── name: "homepage-hero"
      ├── imageUrl: "https://firebasestorage.googleapis.com/..."
      ├── altText: "Moneda Double Eagle din colectia noastra"
      ├── type: "hero"
      ├── active: true
      └── timestamps...
```

## Troubleshooting

### Issue: "Missing or insufficient permissions" error

**Solution:**
1. Make sure you deployed the Firestore rules first
2. Verify you're logged in as an admin user
3. Check that your user ID matches the admin ID in `firestore.rules`

### Issue: Assets not loading on the website

**Solution:**
1. Check browser console for errors
2. Verify assets exist in Firebase Storage
3. Verify Firestore documents exist in `siteAssets` collection
4. Check that `active` field is set to `true`
5. Clear browser cache and reload

### Issue: Upload fails with CORS error

**Solution:**
1. Check Firebase Storage CORS configuration
2. Verify the files are in `web/public/assets/` directory
3. Try uploading from a different browser

## Benefits of This Implementation

1. **Dynamic Updates**: Change logo/images without redeploying code
2. **CDN Performance**: Firebase Storage provides global CDN
3. **Centralized Management**: All site assets in one place
4. **Fallback Support**: Components fallback to local files if database fails
5. **Admin Control**: Only admins can upload/modify assets
6. **Type Safety**: Full TypeScript support

## Next Steps

After successful deployment:

1. Test the website thoroughly
2. Monitor Firebase Storage usage
3. Consider adding more site assets (banners, icons, etc.)
4. Implement admin dashboard for easier asset management
5. Add image optimization/resizing if needed

## Support

For issues or questions, refer to:
- `SITE_ASSETS_UPLOAD_GUIDE.md` - Detailed feature documentation
- Firebase Console - Check Storage and Firestore
- Browser DevTools - Check for console errors

---

**Important Notes:**
- Always deploy Firestore rules before uploading assets
- Keep the local asset files as fallbacks
- Monitor Firebase Storage costs
- Only admins should access `/upload-site-assets`