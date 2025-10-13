'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Coins, Search, AlertCircle, CheckCircle2, Loader2, TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'

interface Subscription {
  id: number
  org_id: string
  name?: string
  subscription_id: string
  balance_monthly: number
  balance_prepaid: number
  auto_recharge_amount: number
  auto_recharge_threshold: number
  is_trial: boolean
  created_at: string
}

// Convert credits to dollars (100 credits = $1.00) with commas
const creditsToDollars = (credits: number): string => {
  const dollars = (credits / 100).toFixed(2)
  const [whole, decimal] = dollars.split('.')
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${withCommas}.${decimal}`
}

// Convert dollars to credits
const dollarsToCredits = (dollars: number): number => {
  return Math.round(dollars * 100)
}

export default function CreditsManagementPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Selected user and action state
  const [selectedUser, setSelectedUser] = useState<Subscription | null>(null)
  const [actionType, setActionType] = useState<'add' | 'remove' | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [confirmInput, setConfirmInput] = useState('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successDetails, setSuccessDetails] = useState<{
    operation: 'add' | 'remove'
    amount: number
    orgId: string
    newBalance: number
  } | null>(null)
  
  // CRITICAL: Add state to block rendering
  const [authVerified, setAuthVerified] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  
  // CRITICAL: HARDCODED AUTH CHECK - BLOCKS RENDERING
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || !isAuthorizedEmail(session.user.email)) {
        console.log('🚨 UNAUTHORIZED ACCESS TO CREDITS:', session?.user.email || 'no session')
        if (session) await supabase.auth.signOut()
        window.location.href = '/auth/signin'
        return
      }
      
      console.log('✅ Authorized for credits:', session.user.email)
      setAuthVerified(true)
      setAuthChecking(false)
    }
    checkAuth()
  }, [supabase])

  // Fetch subscriptions on mount (only after auth verified)
  useEffect(() => {
    if (authVerified) {
      fetchSubscriptions()
    }
  }, [authVerified])

  const fetchSubscriptions = async () => {
    // Check cache first (instant!)
    const cached = sessionStorage.getItem('credits_cache')
    if (cached) {
      try {
        const { subscriptions, timestamp } = JSON.parse(cached)
        const age = Date.now() - timestamp
        
        // Use cache if less than 10 minutes old
        if (age < 10 * 60 * 1000) {
          console.log('⚡ Using cached credits data')
          setSubscriptions(subscriptions || [])
          setLoading(false)
          return
        }
      } catch (e) {
        console.warn('Failed to parse credits cache')
      }
    }
    
    setLoading(true)
    setMessage(null)
    
    try {
      // Fetch first batch of 1000 users
      const response = await fetch('/api/credits?limit=1000&offset=0')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch subscriptions')
      }

      const result = await response.json()
      setSubscriptions(result.data)
      setLoading(false) // Show first batch immediately
      
      // Cache the data
      sessionStorage.setItem('credits_cache', JSON.stringify({
        subscriptions: result.data,
        timestamp: Date.now()
      }))
      console.log('💾 Credits data cached')
      
      // If there are more users, fetch them in the background
      if (result.total > 1000) {
        fetchRemainingSubscriptions(result.total, result.data)
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load subscriptions data'
      })
      setLoading(false)
    }
  }

  const fetchRemainingSubscriptions = async (total: number, firstBatch: Subscription[]) => {
    try {
      let allData = [...firstBatch]
      const batchSize = 1000
      
      // Fetch remaining batches
      for (let offset = 1000; offset < total && offset < 10000; offset += batchSize) {
        const response = await fetch(`/api/credits?limit=${batchSize}&offset=${offset}`)
        if (response.ok) {
          const result = await response.json()
          allData = [...allData, ...result.data]
          setSubscriptions(allData) // Update UI as we load more
        }
      }
    } catch (error) {
      console.error('Error fetching remaining subscriptions:', error)
      // Don't show error since we already have the first batch
    }
  }

  const handleUserClick = (subscription: Subscription) => {
    setSelectedUser(subscription)
    setActionType(null)
    setAmountInput('')
    setConfirmInput('')
    setMessage(null)
  }

  const closeDialog = () => {
    setSelectedUser(null)
    setActionType(null)
    setAmountInput('')
    setConfirmInput('')
    setMessage(null)
  }

  const executeAction = async () => {
    if (!selectedUser || !actionType || !amountInput) return

    const amount = parseFloat(amountInput)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive amount' })
      return
    }

    // Check confirmation (with commas for readability)
    const expectedConfirm = `CONFIRM ${actionType.toUpperCase()} $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (confirmInput.trim() !== expectedConfirm) {
      setMessage({
        type: 'error',
        text: `Please type exactly: ${expectedConfirm}`
      })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: selectedUser.org_id,
          amount: dollarsToCredits(amount),
          operation: actionType
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to adjust credits')
      }

      const result = await response.json()
      
      // Show success popup
      setSuccessDetails({
        operation: actionType,
        amount,
        orgId: selectedUser.org_id,
        newBalance: result.newBalance
      })
      setShowSuccessPopup(true)

      // Refresh subscriptions
      await fetchSubscriptions()
      
      // Close dialog
      closeDialog()
      
      // Auto-hide success popup after 5 seconds
      setTimeout(() => {
        setShowSuccessPopup(false)
      }, 5000)
    } catch (error) {
      console.error('Error adjusting credits:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to adjust credits'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Filter by search (already sorted by API)
  const filteredAndSortedSubscriptions = subscriptions
    .filter(sub => 
      sub.org_id.toLowerCase().includes(searchTerm.toLowerCase())
    )

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
              <p className="text-sm font-medium">Loading credits</p>
              <p className="text-xs text-muted-foreground">Fetching credits data...</p>
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
            <h1 className="text-3xl font-bold">Credits Management</h1>
            <p className="text-muted-foreground mt-2">
              Click on a user to add or remove credits. Sorted by highest balance.
            </p>
          </div>
          <Button onClick={fetchSubscriptions} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Global Status Message */}
        {message && !selectedUser && (
          <Card className={
            message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
            message.type === 'info' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
            'border-red-500 bg-red-50 dark:bg-red-950'
          }>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : message.type === 'info' ? (
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={
                  message.type === 'success' ? 'text-green-900 dark:text-green-100' :
                  message.type === 'info' ? 'text-blue-900 dark:text-blue-100' :
                  'text-red-900 dark:text-red-100'
                }>
                  {message.text}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Search Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by org_id..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                User Balances (Highest First)
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {filteredAndSortedSubscriptions.length} users
              </Badge>
            </CardTitle>
            <CardDescription>
              Click on any user to manage their credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAndSortedSubscriptions.length === 0 ? (
              <div className="text-center py-12">
                <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No subscriptions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Name / Org ID</th>
                      <th className="text-right py-3 px-4 font-medium">Prepaid Balance</th>
                      <th className="text-right py-3 px-4 font-medium">Monthly Balance</th>
                      <th className="text-center py-3 px-4 font-medium">Trial</th>
                      <th className="text-right py-3 px-4 font-medium">Auto Recharge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedSubscriptions.map((sub) => (
                      <tr
                        key={sub.id}
                        onClick={() => handleUserClick(sub)}
                        className="border-b hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{sub.name || sub.org_id}</div>
                            {sub.name && (
                              <div className="text-xs text-muted-foreground">{sub.org_id}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-black dark:text-white">
                            ${creditsToDollars(sub.balance_prepaid || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(sub.balance_prepaid || 0).toLocaleString()} credits
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-medium">
                            ${creditsToDollars(sub.balance_monthly || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(sub.balance_monthly || 0).toLocaleString()} credits
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={sub.is_trial ? 'secondary' : 'outline'}>
                            {sub.is_trial ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sub.auto_recharge_amount > 0 ? (
                            <div className="text-sm">
                              <div>${creditsToDollars(sub.auto_recharge_amount)}</div>
                              <div className="text-xs text-muted-foreground">
                                at ${creditsToDollars(sub.auto_recharge_threshold)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Action Dialog */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Manage Credits for {selectedUser.org_id}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={closeDialog}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Current prepaid balance: ${creditsToDollars(selectedUser.balance_prepaid || 0)} ({(selectedUser.balance_prepaid || 0).toLocaleString()} credits)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Message inside dialog */}
                {message && (
                  <Card className={
                    message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
                    'border-red-500 bg-red-50 dark:bg-red-950'
                  }>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={
                          message.type === 'success' ? 'text-green-900 dark:text-green-100' :
                          'text-red-900 dark:text-red-100'
                        }>
                          {message.text}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 1: Choose action */}
                {!actionType && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">What would you like to do?</h3>
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={() => setActionType('add')}
                        className="w-full h-16"
                        variant="default"
                      >
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Add Credits
                      </Button>
                      <Button
                        onClick={() => setActionType('remove')}
                        className="w-full h-16"
                        variant="outline"
                      >
                        <TrendingDown className="h-5 w-5 mr-2" />
                        Remove Credits
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Enter amount and confirm */}
                {actionType && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">
                        {actionType === 'add' ? 'Adding credits to' : 'Removing credits from'}: <strong>{selectedUser.org_id}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Current balance: ${creditsToDollars(selectedUser.balance_prepaid || 0)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount (in dollars)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="100.00"
                        value={amountInput}
                        onChange={(e) => {
                          setAmountInput(e.target.value)
                          setConfirmInput('')
                        }}
                        disabled={submitting}
                      />
                      {amountInput && parseFloat(amountInput) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          = {dollarsToCredits(parseFloat(amountInput)).toLocaleString()} credits
                        </p>
                      )}
                    </div>

                    {amountInput && parseFloat(amountInput) > 0 && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Type to confirm (case sensitive)</label>
                          <Input
                            type="text"
                            placeholder={`CONFIRM ${actionType.toUpperCase()} $${parseFloat(amountInput).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            disabled={submitting}
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            Type exactly: <code className="bg-muted px-1 py-0.5 rounded">CONFIRM {actionType.toUpperCase()} ${parseFloat(amountInput).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code>
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 pt-4">
                          <Button
                            onClick={executeAction}
                            disabled={submitting || confirmInput.trim() !== `CONFIRM ${actionType.toUpperCase()} $${parseFloat(amountInput).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            variant={actionType === 'add' ? 'default' : 'outline'}
                            className="w-full"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>Execute {actionType === 'add' ? 'Add' : 'Remove'}</>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={closeDialog}
                            disabled={submitting}
                            className="w-full"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Success Popup */}
      {showSuccessPopup && successDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="border-2 shadow-2xl min-w-[450px] animate-in zoom-in-95">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-8 w-8 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-lg font-bold mb-3">
                    Credits {successDetails.operation === 'add' ? 'Added' : 'Removed'} Successfully
                  </h4>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>User:</strong> {successDetails.orgId}
                    </p>
                    <p>
                      <strong>Amount:</strong> ${successDetails.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({dollarsToCredits(successDetails.amount).toLocaleString()} credits)
                    </p>
                    <p className="text-lg font-bold pt-2 border-t">
                      <strong>New Balance:</strong> ${creditsToDollars(successDetails.newBalance)}
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
