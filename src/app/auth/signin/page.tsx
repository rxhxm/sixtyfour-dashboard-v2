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
    
    // Start preloading data in background (silent)
    const preloadData = async () => {
      try {
        console.log('🔄 Pre-loading 24 hours data...')
        
        const endDate = new Date()
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
        
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        
        // Pre-load with longer timeout (3 minutes)
        const fetchWithTimeout = (url: string, timeout = 180000) => {
          return Promise.race([
            fetch(url),
            new Promise<Response>((_, reject) => 
              setTimeout(() => reject(new Error('Preload timeout')), timeout)
            )
          ])
        }
        
        // Pre-load all three endpoints in parallel
        const results = await Promise.allSettled([
          fetchWithTimeout(`/api/metrics?${params}`).then(r => r.json()),
          fetchWithTimeout(`/api/langfuse-metrics?${params}`).then(r => r.json()),
          fetchWithTimeout(`/api/langfuse-chart-data?${params}`).then(r => r.json())
        ])
        
        // Store successful responses
        let successCount = 0
        
        if (results[0].status === 'fulfilled') {
          sessionStorage.setItem('preloaded_metrics_24h', JSON.stringify(results[0].value))
          successCount++
        }
        
        if (results[1].status === 'fulfilled') {
          sessionStorage.setItem('preloaded_langfuse_24h', JSON.stringify(results[1].value))
          successCount++
        }
        
        if (results[2].status === 'fulfilled') {
          sessionStorage.setItem('preloaded_chart_24h', JSON.stringify(results[2].value))
          successCount++
        }
        
        if (successCount > 0) {
          sessionStorage.setItem('preloaded_timestamp', Date.now().toString())
          console.log(`✅ Pre-loaded ${successCount}/3 endpoints`)
        }
      } catch (error) {
        console.error('Preload failed:', error)
      }
    }
    
    preloadData()
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

      // Wait for preload if not complete
      const preloadComplete = sessionStorage.getItem('preloaded_timestamp')
      if (!preloadComplete) {
        console.log('⏳ Waiting for preload...')
        const maxWait = 15000
        const startWait = Date.now()
        
        while (!sessionStorage.getItem('preloaded_timestamp') && (Date.now() - startWait) < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Success - navigate to dashboard
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

