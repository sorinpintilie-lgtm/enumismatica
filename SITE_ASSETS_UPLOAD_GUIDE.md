# Site Assets Upload Guide

This guide explains how to upload and manage site assets (logo, hero images, etc.) in Firebase Storage and Firestore.

## Overview

Site assets are now stored in Firebase Storage and referenced in Firestore for easy management and updates. This allows for:
- Dynamic asset loading from the database
- Easy updates without code changes
- Centralized asset management
- Better performance with CDN delivery

## Architecture

### Components Created

1. **Type Definition** (`shared/types.ts`)
   - `SiteAsset` interface for asset metadata

2. **Service Layer** (`shared/siteAssetService.ts`)
   - `getSiteAsset(name)` - Fetch asset by name
   - `getAllSiteAssets()` - Get all active assets
   - `createOrUpdateSiteAsset()` - Create/update asset
   - `uploadLocalFileAsSiteAsset()` - Upload from local file
   - `deactivateSiteAsset()` - Deactivate an asset

3. **React Hook** (`web/app/hooks/useSiteAsset.ts`)
   - `useSiteAsset(name)` - Custom hook for fetching assets in components

4. **Upload Page** (`web/app/upload-site-assets/page.tsx`)
   - Admin interface for uploading assets

## Current Assets

### Logo
- **Name**: `logo`
- **Type**: `logo`
- **File**: `eNumismatica.ro_logo.png`
- **Used in**: Navigation component
- **Alt Text**: "E-numismatica Logo"

### Homepage Hero
- **Name**: `homepage-hero`
- **Type**: `hero`
- **File**: `20-gouden-munt-double-eagle-coronet-head-achterkant-web_big.png`
- **Used in**: Homepage hero section
- **Alt Text**: "Moneda Double Eagle din colectia noastra"

## How to Upload Assets

### Step 1: Start the Development Server
```bash
cd web
npm run dev
```

### Step 2: Navigate to Upload Page
Open your browser and go to:
```
http://localhost:3000/upload-site-assets
```

### Step 3: Upload Assets
1. Click the "Upload Assets to Firebase" button
2. Wait for the upload process to complete
3. Verify the results showing:
   - Asset ID
   - Type
   - Alt Text
   - Firebase Storage URL

### Step 4: Verify Assets
The assets should now be:
- Stored in Firebase Storage under `site-assets/[asset-name]/`
- Referenced in Firestore collection `siteAssets`
- Automatically loaded on the homepage and navigation

## Firestore Structure

```
siteAssets/
  ├── logo/
  │   ├── id: "logo"
  │   ├── name: "logo"
  │   ├── description: "Main site logo displayed in navigation"
  │   ├── imageUrl: "https://firebasestorage.googleapis.com/..."
  │   ├── altText: "E-numismatica Logo"
  │   ├── type: "logo"
  │   ├── active: true
  │   ├── createdAt: Timestamp
  │   └── updatedAt: Timestamp
  │
  └── homepage-hero/
      ├── id: "homepage-hero"
      ├── name: "homepage-hero"
      ├── description: "Homepage hero image showing Double Eagle Coronet Head coin"
      ├── imageUrl: "https://firebasestorage.googleapis.com/..."
      ├── altText: "Moneda Double Eagle din colectia noastra"
      ├── type: "hero"
      ├── active: true
      ├── createdAt: Timestamp
      └── updatedAt: Timestamp
```

## Usage in Components

### Example: Using in a Component

```tsx
import { useSiteAsset } from '../hooks/useSiteAsset';
import Image from 'next/image';

export default function MyComponent() {
  const { data: logoAsset, isLoading, error } = useSiteAsset('logo');

  if (isLoading) {
    return <div className="h-20 w-20 bg-slate-100 animate-pulse" />;
  }

  if (error || !logoAsset) {
    return <div>Error loading asset</div>;
  }

  return (
    <Image
      src={logoAsset.imageUrl}
      alt={logoAsset.altText}
      width={80}
      height={80}
      className="h-20 w-20 object-contain"
    />
  );
}
```

## Adding New Assets

To add a new site asset:

1. Place the image file in `web/public/assets/`
2. Navigate to `/upload-site-assets`
3. Or use the service directly:

```typescript
import { uploadLocalFileAsSiteAsset } from 'shared/siteAssetService';

await uploadLocalFileAsSiteAsset(
  'my-asset-name',
  '/assets/my-image.png',
  'Alt text for accessibility',
  'banner', // or 'logo', 'hero', 'icon', 'other'
  'Optional description'
);
```

## Benefits

1. **No Code Deployment**: Update images without redeploying the application
2. **CDN Performance**: Firebase Storage provides global CDN delivery
3. **Version Control**: Track asset changes with timestamps
4. **Fallback Support**: Components fallback to local assets if database fetch fails
5. **Type Safety**: Full TypeScript support for asset metadata

## Troubleshooting

### Assets Not Loading
1. Check Firebase Storage rules allow read access
2. Verify Firestore security rules allow reading `siteAssets` collection
3. Check browser console for errors
4. Ensure assets are marked as `active: true`

### Upload Fails
1. Verify Firebase configuration in `.env.local`
2. Check Firebase Storage is enabled in Firebase Console
3. Ensure you have write permissions
4. Check file size limits (max 5MB per image)

## Security Considerations

- Assets are publicly readable (required for website display)
- Only authenticated admins should access `/upload-site-assets`
- Firestore rules should restrict write access to admins only
- Storage rules should allow public read, admin write

## Future Enhancements

- Admin dashboard for managing all site assets
- Image optimization and resizing
- Multiple image variants (thumbnail, medium, large)
- Asset versioning and rollback
- Bulk upload functionality