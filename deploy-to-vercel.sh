#!/bin/bash

echo "🚀 Preparing for Vercel Deployment..."
echo ""

# Add all files
echo "📦 Adding all files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "feat: Add authentication system and prepare for Vercel deployment

- NextAuth.js authentication with team credentials (1-week sessions)
- Sixtyfour team members: Saarth, Roham, Chris Price, Josh
- Complete dashboard with org filtering and time navigation
- Database + Langfuse cost tracking integration
- Production-ready for Vercel deployment"

echo ""
echo "✅ Repository ready for deployment!"
echo ""
echo "🔗 Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Go to vercel.com and import your repository"
echo "3. Configure environment variables (see DEPLOYMENT.md)"
echo ""
echo "📋 Environment variables you'll need:"
echo "   NEXTAUTH_SECRET=3e2321294bbe3f2bb37b09132a7d3577a7903e995415fccfbff27c44805fc0af"
echo "   NEXTAUTH_URL=https://YOUR-VERCEL-URL.vercel.app"
echo "   SUPABASE_URL=${SUPABASE_URL}"
echo "   SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}"
echo "   LANGFUSE_PUBLIC_KEY=${LANGFUSE_PUBLIC_KEY}"
echo "   LANGFUSE_SECRET_KEY=${LANGFUSE_SECRET_KEY}"
echo "   LANGFUSE_HOST=${LANGFUSE_HOST}"
echo ""
echo "🎯 Team login credentials (production-ready):"
echo "   saarth@sixtyfour.ai / aurelia"
echo "   roham@sixtyfour.ai / saja"
echo "   chrisprice@sixtyfour.ai / fish"
echo "   josh@sixtyfour.ai / violet" 