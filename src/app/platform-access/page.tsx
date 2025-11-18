'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Mail, Trash2, AlertCircle, CheckCircle2, Loader2, Info, X } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'
import { OrgAccessManager } from '@/components/org-access-manager'

interface FeatureFlag {
  id: number
  key: string
  name: string
  filters: {
    groups: Array<{
      properties?: Array<{
        key: string
        value: string | string[]
        operator: string
        type: string
      }>
      rollout_percentage?: number
    }>
    multivariate?: any
  }
  active: boolean
}

export default function PlatformAccessPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  
  // CRITICAL: Block rendering until auth verified
  const [authVerified, setAuthVerified] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  
  const [loading, setLoading] = useState(true)
  const [featureFlag, setFeatureFlag] = useState<FeatureFlag | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [set2Emails, setSet2Emails] = useState<string[]>([])
  const [set1Pattern, setSet1Pattern] = useState<string>('')
  const [allUserEmails, setAllUserEmails] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')

  // CRITICAL: HARDCODED AUTH CHECK - BLOCKS RENDERING
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || !isAuthorizedEmail(session.user.email)) {
        console.log('🚨 UNAUTHORIZED ACCESS TO PLATFORM:', session?.user.email || 'no session')
        if (session) await supabase.auth.signOut()
        window.location.href = '/auth/signin'
        return
      }
      
      console.log('✅ Authorized for platform:', session.user.email)
      setAuthVerified(true)
      setAuthChecking(false)
    }
    checkAuth()
  }, [supabase])
  
  // Fetch feature flag data on mount (only after auth verified)
  useEffect(() => {
    if (authVerified) {
      fetchFeatureFlag()
      loadAllUserEmails()
    }
  }, [authVerified])
  
  // Load all user emails for autocomplete
  const loadAllUserEmails = async () => {
    try {
      // Add cache-busting timestamp to force fresh data
      const response = await fetch(`/api/org-emails?t=${Date.now()}`)
      const data = await response.json()
      const uniqueEmails = [...new Set(Object.values(data?.emailMap || {}))] as string[]
      setAllUserEmails(uniqueEmails)
      console.log('📧 Loaded', uniqueEmails.length, 'emails for autocomplete')
    } catch (e) {
      console.error('Failed to load user emails:', e)
    }
  }
  
  // Refresh email list when page becomes visible (user switches back to this tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && authVerified) {
        console.log('👁️ Tab visible - refreshing email list')
        loadAllUserEmails()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [authVerified])

  const fetchFeatureFlag = async () => {
    // Check cache first (instant!)
    const cached = sessionStorage.getItem('platform_cache')
    if (cached) {
      try {
        const { featureFlag, set1Pattern, set2Emails, timestamp } = JSON.parse(cached)
        const age = Date.now() - timestamp
        
        // Use cache if less than 10 minutes old
        if (age < 10 * 60 * 1000) {
          console.log('⚡ Using cached platform data')
          setFeatureFlag(featureFlag)
          setSet1Pattern(set1Pattern || '')
          setSet2Emails(set2Emails || [])
          setLoading(false)
          return
        }
      } catch (e) {
        console.warn('Failed to parse platform cache')
      }
    }
    
    setLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/posthog/feature-flags?key=platform_access')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch feature flag')
      }

      const data = await response.json()
      setFeatureFlag(data)

      let pattern = ''
      let emails: string[] = []

      // Parse Set 1 and Set 2
      if (data.filters?.groups) {
        // Set 1 should be the regex pattern (first group)
        const set1 = data.filters.groups[0]
        if (set1?.properties?.[0]?.value) {
          pattern = set1.properties[0].value as string
          setSet1Pattern(pattern)
        }

        // Set 2 should be the email list (second group)
        const set2 = data.filters.groups[1]
        if (set2?.properties?.[0]?.value && Array.isArray(set2.properties[0].value)) {
          emails = set2.properties[0].value
          setSet2Emails(emails)
        }
      }
      
      // Cache the data
      sessionStorage.setItem('platform_cache', JSON.stringify({
        featureFlag: data,
        set1Pattern: pattern,
        set2Emails: emails,
        timestamp: Date.now()
      }))
      console.log('💾 Platform data cached')
    } catch (error) {
      console.error('Error fetching feature flag:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load feature flag data'
      })
    } finally {
      setLoading(false)
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const addEmail = async () => {
    const email = emailInput.trim()

    // Validation
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    if (set2Emails.includes(email)) {
      setMessage({ type: 'error', text: 'This email already has access' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      if (!featureFlag) {
        throw new Error('Feature flag not loaded')
      }

      // Create updated filters with new email added to Set 2
      const updatedEmails = [...set2Emails, email]
      
      // ROBUST APPROACH: Preserve ALL existing groups, only update Group 2 (email list)
      const updatedGroups = featureFlag.filters.groups.map((group: any, index: number) => {
        // Only modify Group 2 (index 1) - the email list we manage
        if (index === 1) {
          return {
            ...group,
            properties: [
              {
                key: 'email',
                value: updatedEmails,
                operator: 'exact',
                type: 'person'
              }
            ],
            rollout_percentage: 100
          }
        }
        // Keep all other groups completely unchanged
        return group
      })
      
      const updatedFilters = {
        ...featureFlag.filters,
        groups: updatedGroups
      }

      const response = await fetch('/api/posthog/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagId: featureFlag.id,
          filters: updatedFilters
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update feature flag')
      }

      // Update local state
      setSet2Emails(updatedEmails)
      setEmailInput('')
      
      // Show success popup (like credits management)
      setSuccessEmail(email)
      setShowSuccessPopup(true)
      
      // Auto-hide popup after 5 seconds
      setTimeout(() => setShowSuccessPopup(false), 5000)

      // Refresh feature flag data
      await fetchFeatureFlag()
    } catch (error) {
      console.error('Error adding email:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add email'
      })
      // Auto-clear error after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setSubmitting(false)
    }
  }

  const removeEmail = async (emailToRemove: string) => {
    if (!confirm(`Remove access for ${emailToRemove}?`)) {
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      if (!featureFlag) {
        throw new Error('Feature flag not loaded')
      }

      // Create updated filters with email removed from Set 2
      const updatedEmails = set2Emails.filter(e => e !== emailToRemove)
      
      // ROBUST APPROACH: Preserve ALL existing groups, only update Group 2 (email list)
      const updatedGroups = featureFlag.filters.groups.map((group: any, index: number) => {
        // Only modify Group 2 (index 1) - the email list we manage
        if (index === 1) {
          return {
            ...group,
            properties: [
              {
                key: 'email',
                value: updatedEmails,
                operator: 'exact',
                type: 'person'
              }
            ],
            rollout_percentage: 100
          }
        }
        // Keep all other groups completely unchanged
        return group
      })
      
      const updatedFilters = {
        ...featureFlag.filters,
        groups: updatedGroups
      }

      const response = await fetch('/api/posthog/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagId: featureFlag.id,
          filters: updatedFilters
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update feature flag')
      }

      // Update local state
      setSet2Emails(updatedEmails)
      setMessage({ type: 'success', text: `Successfully removed ${emailToRemove} from platform access` })

      // Refresh feature flag data
      await fetchFeatureFlag()
    } catch (error) {
      console.error('Error removing email:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove email'
      })
    } finally {
      setSubmitting(false)
    }
  }

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

  // Then loading check
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary opacity-20 mx-auto"></div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Loading platform access</p>
              <p className="text-xs text-muted-foreground">Fetching access data...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Platform Access Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage user access to the Sixtyfour platform via PostHog feature flags
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

        {/* Add New User - Unified with user list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New User
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {set2Emails.length} users
              </Badge>
            </CardTitle>
            <CardDescription>
              Grant platform access to a new user by adding their email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add email input */}
            <div className="flex gap-3 relative">
              <div className="flex-1 relative">
                <Input
                  type="email"
                  placeholder="Start typing email..."
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value)
                    setShowSuggestions(e.target.value.length > 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !submitting) {
                      setShowSuggestions(false)
                      addEmail()
                    }
                    if (e.key === 'Escape') {
                      setShowSuggestions(false)
                    }
                  }}
                  onFocus={() => emailInput && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={submitting}
                  className="flex-1"
                />
                {/* Autocomplete dropdown */}
                {showSuggestions && emailInput && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {allUserEmails
                      .filter(email => email.toLowerCase().includes(emailInput.toLowerCase()))
                      .slice(0, 10)
                      .map(email => (
                        <div
                          key={email}
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            setEmailInput(email)
                            setShowSuggestions(false)
                          }}
                        >
                          {email}
                        </div>
                      ))}
                    {allUserEmails.filter(email => email.toLowerCase().includes(emailInput.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No matching users found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={addEmail}
                disabled={submitting || !emailInput.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Access
                  </>
                )}
              </Button>
            </div>

            {/* User list */}
            {set2Emails.length === 0 ? (
              <div className="text-center py-12 border-t">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No users added yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add an email above to grant access</p>
              </div>
            ) : (
              <div className="space-y-2 pt-4 border-t">
                {[...set2Emails].reverse().map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmail(email)}
                      disabled={submitting}
                      className="hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4 text-black dark:text-white" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
      
      {/* Success Popup - Like Credits Management */}
      {showSuccessPopup && successEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="border-2 shadow-2xl min-w-[450px] animate-in zoom-in-95">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-lg font-bold mb-3">
                    User Added Successfully
                  </h4>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Email:</strong> {successEmail}
                    </p>
                    <p className="text-muted-foreground">
                      They now have access to the Sixtyfour platform
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuccessPopup(false)}
                  className="hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}

