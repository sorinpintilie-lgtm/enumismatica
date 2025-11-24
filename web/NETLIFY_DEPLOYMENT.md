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
- **Node version:** `18`

### 2. Environment Variables
Add the following environment variables in Netlify dashboard (Site Settings > Environment Variables):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
NEXT_PUBLIC_NODE_ENV=production
```

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