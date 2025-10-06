'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock } from "lucide-react"

export default function SignIn() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [preloadStatus, setPreloadStatus] = useState("")
  const router = useRouter()

  // Hardcoded password
  const CORRECT_PASSWORD = "thepursuitofllh"

  useEffect(() => {
    // Check if user is already authenticated
    const isAuthenticated = sessionStorage.getItem("authenticated")
    if (isAuthenticated === "true") {
      router.push("/")
      return
    }

    // Pre-load 24 hours data in the background
    const preloadData = async () => {
      try {
        setPreloadStatus("Pre-loading dashboard data...")
        console.log('🔄 Pre-loading 24 hours data on signin page...')
        
        const endDate = new Date()
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
        
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        
        // Pre-load all three endpoints in parallel
        const [metricsRes, langfuseRes, chartRes] = await Promise.all([
          fetch(`/api/metrics?${params}`),
          fetch(`/api/langfuse-metrics?${params}`),
          fetch(`/api/langfuse-chart-data?${params}`)
        ])
        
        // Store responses in sessionStorage for instant loading
        if (metricsRes.ok) {
          const data = await metricsRes.json()
          sessionStorage.setItem('preloaded_metrics_24h', JSON.stringify(data))
        }
        if (langfuseRes.ok) {
          const data = await langfuseRes.json()
          sessionStorage.setItem('preloaded_langfuse_24h', JSON.stringify(data))
        }
        if (chartRes.ok) {
          const data = await chartRes.json()
          sessionStorage.setItem('preloaded_chart_24h', JSON.stringify(data))
        }
        
        sessionStorage.setItem('preloaded_timestamp', Date.now().toString())
        console.log('✅ Pre-loaded 24 hours data successfully!')
        setPreloadStatus("Data ready!")
        setTimeout(() => setPreloadStatus(""), 1000)
      } catch (error) {
        console.error('Failed to pre-load data:', error)
        setPreloadStatus("")
      }
    }
    
    preloadData()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      if (password === CORRECT_PASSWORD) {
        // Set authentication in session storage
        sessionStorage.setItem("authenticated", "true")
        router.push("/")
      } else {
        setError("Invalid password")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
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
            Enter your password to continue
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-muted/50 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
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
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Access Dashboard
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Protected dashboard • Authorized access only
        </p>
        
        {/* Preload Status */}
        {preloadStatus && (
          <p className="text-center text-xs text-green-600 dark:text-green-400">
            {preloadStatus}
          </p>
        )}
      </div>
    </div>
  )
} 