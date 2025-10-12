'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Mail, Trash2, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'

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
    }
  }, [authVerified])

  const fetchFeatureFlag = async () => {
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

      // Parse Set 1 and Set 2
      if (data.filters?.groups) {
        // Set 1 should be the regex pattern (first group)
        const set1 = data.filters.groups[0]
        if (set1?.properties?.[0]?.value) {
          setSet1Pattern(set1.properties[0].value as string)
        }

        // Set 2 should be the email list (second group)
        const set2 = data.filters.groups[1]
        if (set2?.properties?.[0]?.value && Array.isArray(set2.properties[0].value)) {
          setSet2Emails(set2.properties[0].value)
        }
      }
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
      const updatedFilters = {
        ...featureFlag.filters,
        groups: [
          // Set 1 - Keep unchanged (regex pattern)
          featureFlag.filters.groups[0],
          // Set 2 - Updated email list
          {
            ...featureFlag.filters.groups[1],
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
        ]
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
      setMessage({ type: 'success', text: `Successfully added ${email} to platform access` })

      // Refresh feature flag data
      await fetchFeatureFlag()
    } catch (error) {
      console.error('Error adding email:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add email'
      })
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
      const updatedFilters = {
        ...featureFlag.filters,
        groups: [
          // Set 1 - Keep unchanged (regex pattern)
          featureFlag.filters.groups[0],
          // Set 2 - Updated email list
          {
            ...featureFlag.filters.groups[1],
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
        ]
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

        {/* Add New User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </CardTitle>
            <CardDescription>
              Grant platform access to a new user by adding their email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="user@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submitting && addEmail()}
                disabled={submitting}
                className="flex-1"
              />
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
          </CardContent>
        </Card>

        {/* Current Users with Access (Set 2) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Current Users with Access (Set 2)
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {set2Emails.length} users
              </Badge>
            </CardTitle>
            <CardDescription>
              Users explicitly granted access via email list (managed here)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {set2Emails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No users in Set 2 yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add an email above to grant access</p>
              </div>
            ) : (
              <div className="space-y-2">
                {set2Emails.map((email) => (
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
                      size="sm"
                      onClick={() => removeEmail(email)}
                      disabled={submitting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Set 1 - Read Only (Regex Pattern) */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Set 1 - Regex Pattern (Read Only)
            </CardTitle>
            <CardDescription>
              This pattern automatically grants access to all matching email domains. Cannot be modified here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <code className="text-sm font-mono break-all">
                {set1Pattern || 'No regex pattern found'}
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              This regex pattern is managed directly in PostHog and remains unchanged by this interface.
            </p>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}

