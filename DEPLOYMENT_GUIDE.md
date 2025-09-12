# Vercel Deployment Guide

## Repository Information
- **GitHub Repository:** https://github.com/rxhxm/sixtyfour-dashboard (PRIVATE)
- **Project Name:** chris-s-dashboard

## Step 1: Connect to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository: `rxhxm/sixtyfour-dashboard`
4. Vercel will automatically detect it's a Next.js project

## Step 2: Configure Environment Variables

In the Vercel dashboard for your project, go to Settings → Environment Variables and add:

### Required Variables:
```
LANGFUSE_PUBLIC_KEY = pk-lf-f0f9f1ed-0be8-41de-932c-a1ef1f1bd843
LANGFUSE_SECRET_KEY = sk-lf-876c3729-97bc-4a38-82cf-2f39c7f04e65
LANGFUSE_HOST = https://us.cloud.langfuse.com
```

### Optional Variables (if using Supabase):
```
NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
```

### Authentication (required for NextAuth):
```
NEXTAUTH_SECRET = (generate with: openssl rand -base64 32)
NEXTAUTH_URL = https://sixtyfour-dashboard-qthh.vercel.app
```

Note: Replace NEXTAUTH_URL with your actual Vercel URL

## Step 3: Deploy

1. After adding environment variables, click "Deploy"
2. Vercel will build and deploy your application
3. You'll get a production URL like: `https://chris-s-dashboard.vercel.app`

## Step 4: Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

## Automatic Deployments

- Every push to `main` branch will trigger a new deployment
- Preview deployments are created for pull requests

## Local Development

To run locally with the same environment:
1. Copy `.env.example` to `.env.local`
2. Add your environment variables
3. Run `npm install && npm run dev`

## Troubleshooting

If deployment fails:
1. Check build logs in Vercel dashboard
2. Ensure all environment variables are set
3. Verify Node.js version compatibility (18.x or higher)

## Security Notes

- Never commit `.env.local` or actual API keys to GitHub
- Use Vercel's environment variables for production secrets
- The repository is private to protect your code and configurations
