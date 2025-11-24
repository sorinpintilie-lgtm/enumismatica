# Netlify Deployment Guide

## Prerequisites
- GitHub repository with your project (✓ Done - pushed to https://github.com/sorinpintilie-lgtm/enumismatica.git)
- Netlify account

## Deployment Steps

### 1. Connect GitHub Repository to Netlify
1. Go to [Netlify](https://www.netlify.com/) and sign in
2. Click "New site from Git"
3. Choose "GitHub" and authorize Netlify to access your repositories
4. Select the `enumismatica` repository
5. Configure the build settings:

**Build Settings:**
- **Base directory:** `web`
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** `20` (required for Next.js 16)

### 2. Environment Variables
Add the following environment variables in Netlify dashboard (Site Settings > Environment Variables):

```
# Firebase Configuration - Already configured with real values
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBbIZjstBI9an8Qnff6MEdraZErMzVjw1M
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-numismatica-ro.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-numismatica-ro
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-numismatica-ro.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=686515512350
NEXT_PUBLIC_FIREBASE_APP_ID=1:686515512350:web:c281556b58e08bcb167a0f
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-4BBCPEDX0G

# App Configuration - Update with your actual domain
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
NEXT_PUBLIC_NODE_ENV=production
```

**Note:** The Firebase configuration is already set with the real values from the e-numismatica-ro Firebase project. You only need to update the `NEXT_PUBLIC_APP_URL` with your actual Netlify site URL.

### 3. Deploy
Click "Deploy site" and Netlify will:
1. Clone your repository
2. Install dependencies in the `web` directory
3. Build the Next.js app
4. Deploy to their CDN

### 4. Post-Deployment
- Your site will be available at `https://your-site-name.netlify.app`
- Enable HTTPS (automatically handled by Netlify)
- Configure custom domain if needed

## Configuration Files Created
- `web/netlify.toml` - Netlify build and deployment configuration
- `web/.env.netlify.example` - Environment variables template

## Build Configuration
The `netlify.toml` file includes:
- Security headers
- Build optimization settings
- Proper redirect handling for Next.js
- Functions configuration if needed

## Troubleshooting
- Check build logs in Netlify dashboard for any errors
- Ensure all environment variables are properly set
- Verify Firebase configuration matches your project settings
- Check that shared dependencies are properly resolved

## Development vs Production
- Development: Use `npm run dev` locally
- Production: Netlify automatically builds and deploys on git push