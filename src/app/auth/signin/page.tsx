'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from '@/lib/supabase/client'
import { isAuthorizedEmail } from '@/lib/auth-guard'

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/")
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Sign in with Supabase Auth (same as main app)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!data.session) {
        setError("Authentication failed. Please try again.")
        setLoading(false)
        return
      }

      // HARDCODED WHITELIST CHECK (only for this dashboard)
      if (!isAuthorizedEmail(data.session.user.email)) {
        console.log('🚨 UNAUTHORIZED EMAIL:', data.session.user.email)
        await supabase.auth.signOut()
        setError("Access denied. This dashboard is restricted to authorized team members only.")
        setLoading(false)
        return
      }

      // Success - navigate to dashboard
      router.refresh()
      router.push("/")
      
    } catch (error) {
      console.error('Login error:', error)
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Card className="overflow-hidden">
          <CardContent className="grid p-0 md:grid-cols-2 md:min-h-[600px]">
            <form className="p-6 md:p-8" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    Login to your Sixtyfour account
                  </p>
                </div>
                
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@sixtyfour.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="https://app.sixtyfour.ai/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Login"}
                </Button>
              </div>
            </form>
            
            {/* Right side - Animated Logo */}
            <div className="bg-muted relative hidden md:block min-h-full">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ minHeight: '100%' }}
              >
                <source src="/logo_chrome.mp4" type="video/mp4" />
              </video>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-balance text-muted-foreground mt-4">
          By clicking continue, you agree to our{" "}
          <a href="https://sixtyfour.ai/terms-of-service" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="https://sixtyfour.ai/privacy-policy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>.
        </div>
      </div>
    </div>
  )
}

