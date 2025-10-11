import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

// NOTE: This NextAuth config is deprecated - now using Supabase Auth
// Kept for reference only, not used in production
// See src/lib/supabase-auth.ts for current auth implementation

const ALLOWED_USERS: never[] = []

// This NextAuth config is no longer used - deprecated in favor of Supabase Auth
// Kept for backwards compatibility only
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize() {
        // Disabled - use Supabase Auth instead
        // See src/lib/supabase-auth.ts
        return null
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
} 