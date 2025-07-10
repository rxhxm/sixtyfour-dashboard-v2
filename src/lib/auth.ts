import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

// Sixtyfour Team - Easy to add/remove users
const ALLOWED_USERS = [
  {
    id: "1",
    name: "Saarth",
    email: "saarth@sixtyfour.ai",
    password: "aurelia"
  },
  {
    id: "2", 
    name: "Roham",
    email: "roham@sixtyfour.ai",
    password: "saja"
  },
  {
    id: "3",
    name: "Chris Price", 
    email: "chrisprice@sixtyfour.ai",
    password: "fish"
  },
  {
    id: "4",
    name: "Josh",
    email: "josh@sixtyfour.ai", 
    password: "violet"
  }
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email", 
          placeholder: "your-email@company.com" 
        },
        password: { 
          label: "Password", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Find user in allowed users list
        const user = ALLOWED_USERS.find(
          u => u.email === credentials.email && u.password === credentials.password
        )

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        }

        return null
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 1 week sessions
  },
  pages: {
    signIn: "/auth/signin",
  },
  // Hardcoded secret for private repo - bypasses Vercel env var issues
  secret: "3e2321294bbe3f2bb37b09132a7d3577a7903e995415fccfbff27c44805fc0af",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
      }
      return session
    },
  },
} 