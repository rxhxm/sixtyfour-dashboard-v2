'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, Mail } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/")
      }
    }
    checkAuth()
    
    // REMOVED: No preloading before authentication verification
    // This was a security risk - data should only load AFTER auth is confirmed
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError("Invalid email or password")
        } else if (signInError.message.includes('Email not confirmed')) {
          setError("Please check your email to confirm your account")
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      if (!data.session) {
        setError("Authentication failed. Please try again.")
        setLoading(false)
        return
      }

      // Check if user has dashboard access
      const checkAccessResponse = await fetch('/api/auth/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })

      const accessData = await checkAccessResponse.json()

      if (!accessData.hasAccess) {
        // User authenticated but doesn't have dashboard access
        await supabase.auth.signOut()
        setError("You don't have access to this dashboard. Contact admin.")
        setLoading(false)
        return
      }

      // Success - navigate to dashboard immediately
      console.log('✅ Login successful, navigating...')
      router.push("/")
      
    } catch (error) {
      console.error('Login error:', error)
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8">
        {/* Title Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Dashboard Access</h1>
          <p className="text-muted-foreground">
            Sign in with your Sixtyfour email
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-muted/50 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@sixtyfour.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center space-x-2">
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <a
                  href="https://app.sixtyfour.ai/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                  Forgot password? Reset on Sixtyfour
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

