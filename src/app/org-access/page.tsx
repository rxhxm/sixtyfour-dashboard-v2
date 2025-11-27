'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'
import { OrgAccessManager } from '@/components/org-access-manager'

export default function OrgAccessPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  
  // CRITICAL: Block rendering until auth verified
  const [authVerified, setAuthVerified] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // CRITICAL: HARDCODED AUTH CHECK - BLOCKS RENDERING
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || !isAuthorizedEmail(session.user.email)) {
        console.log('🚨 UNAUTHORIZED ACCESS TO ORG ACCESS:', session?.user.email || 'no session')
        if (session) await supabase.auth.signOut()
        window.location.href = '/auth/signin'
        return
      }
      
      console.log('✅ Authorized for org access:', session.user.email)
      setAuthVerified(true)
      setAuthChecking(false)
    }
    checkAuth()
  }, [supabase])

  // Auth check first
  if (authChecking || !authVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto"></div>
          </div>
          <p className="text-sm font-medium">Verifying access...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Organization Access
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage user-to-organization assignments for the Sixtyfour platform
            </p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <Card className={message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={message.type === 'success' ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}>
                  {message.text}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Access Management */}
        <OrgAccessManager />
      </div>
    </DashboardLayout>
  )
}



