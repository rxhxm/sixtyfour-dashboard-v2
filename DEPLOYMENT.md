# 🚀 Deploy to Vercel - Free Tier

## Step-by-Step Deployment Guide

### 1. **Prepare Your Code**
```bash
# Make sure everything is committed
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. **Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings ✅

### 3. **Configure Environment Variables**
In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Authentication (CRITICAL - Don't skip!)
NEXTAUTH_SECRET=3e2321294bbe3f2bb37b09132a7d3577a7903e995415fccfbff27c44805fc0af
NEXTAUTH_URL=https://YOUR-VERCEL-URL.vercel.app

# Database
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Langfuse (optional - for cost tracking)
LANGFUSE_PUBLIC_KEY=pk-lf-f0f9f1ed-0be8-41de-932c-a1ef1f1bd843
LANGFUSE_SECRET_KEY=sk-lf-876c3729-97bc-4a38-82cf-2f39c7f04e65
LANGFUSE_HOST=https://us.cloud.langfuse.com
```

### 4. **Update NEXTAUTH_URL After First Deploy**
1. Deploy first with a placeholder NEXTAUTH_URL
2. Get your actual Vercel URL (e.g., `my-dashboard-abc123.vercel.app`)
3. Update `NEXTAUTH_URL` to: `https://my-dashboard-abc123.vercel.app`
4. Redeploy

### 5. **Access Your Live Dashboard**
- URL: `https://YOUR-VERCEL-URL.vercel.app`
- Login with your Sixtyfour team credentials
- Sessions work exactly the same as local development

## 🎯 Team Login Credentials (Production Ready)
- **saarth@sixtyfour.ai** / `aurelia`
- **roham@sixtyfour.ai** / `saja`  
- **chrisprice@sixtyfour.ai** / `fish`
- **josh@sixtyfour.ai** / `violet`

## 🆓 Free Tier Benefits
- ✅ Unlimited deploys
- ✅ Custom domain support
- ✅ Auto-scaling
- ✅ Global CDN
- ✅ 100GB bandwidth/month
- ✅ Analytics included

## 🔧 Future Upgrades
When ready to migrate from hardcoded auth to Supabase:
1. Set up Supabase Auth
2. Update the auth provider in `src/lib/auth.ts`
3. Migration is seamless! 