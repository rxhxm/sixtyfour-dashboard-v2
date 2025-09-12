# API Dashboard

A comprehensive dashboard for monitoring API usage, costs, and performance metrics with Langfuse integration.

## Features

- 📊 Real-time API usage tracking and visualization
- 💰 Cost monitoring and breakdown by organization
- 📈 Interactive charts with customizable time ranges
- 🔍 Detailed trace information and filtering
- 🔐 Password-protected authentication
- 📱 Responsive design with modern UI

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Charts:** Recharts
- **API Integration:** Langfuse
- **Database:** Supabase (optional)
- **Deployment:** Vercel

## Environment Variables

Copy `env.example` to `.env.local` and configure:

```bash
# Required
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key

# Optional
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

This project is configured for deployment on Vercel. Connect your GitHub repository and Vercel will automatically deploy on push to main.

## License

Private - All Rights Reserved
