'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Trash2, CheckCircle2, AlertCircle, Search } from 'lucide-react'

export function OrgAccessManager() {
  const [users, setUsers] = useState<any[]>([])
  const [orgs, setOrgs] = useState<string[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedOrg, setSelectedOrg] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [orgSearch, setOrgSearch] = useState('')
  const [currentOrg, setCurrentOrg] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [existingMapping, setExistingMapping] = useState<string | null>(null)
  const [filterOrg, setFilterOrg] = useState('')
  const [groupByOrg, setGroupByOrg] = useState(false)
  
  // Load data on mount
  useEffect(() => {
    loadUsers()
    loadOrgs()
    loadMappings()
  }, [])
  
  // Look up current org when user is selected
  useEffect(() => {
    if (selectedUser && mappings.length > 0) {
      const mapping = mappings.find(m => m.email === selectedUser)
      setCurrentOrg(mapping?.orgId || null)
    } else {
      setCurrentOrg(null)
    }
  }, [selectedUser, mappings])
  
  const loadUsers = async () => {
    // Fetch all auth users directly (for better autocomplete)
    // This gets ALL 631 real user emails, not just mapped ones
    const response = await fetch('/api/org-emails')
    const data = await response.json()
    
    // Get unique emails from the emailMap
    // API returns { emailMap: { "orgId": "email", ... } }
    const uniqueEmails = [...new Set(Object.values(data?.emailMap || {}))] as string[]
    console.log('📧 Loaded', uniqueEmails.length, 'user emails for autocomplete')
    setUsers(uniqueEmails)
  }
  
  const loadOrgs = async () => {
    const response = await fetch('/api/org-management/valid-orgs')
    const data = await response.json()
    setOrgs(data.orgs || [])
  }
  
  const loadMappings = async () => {
    const response = await fetch('/api/org-management/mappings').then(r => r.json())
    // API returns { mappings: [{ userId, orgId, email, createdAt }, ...] }
    const mappingArray = response?.mappings || []
    console.log('📊 Loaded mappings:', mappingArray.length, 'user-org assignments')
    setMappings(mappingArray)
  }
  
  const handleAdd = async () => {
    if (!selectedUser || !selectedOrg) {
      setMessage({ type: 'error', text: 'Please select both user and organization' })
      return
    }
    
    // Use currentOrg state (already set by useEffect)
    if (currentOrg && currentOrg !== selectedOrg) {
      setExistingMapping(currentOrg)
    } else {
      setExistingMapping(null)
    }
    
    setShowConfirm(true)
  }
  
  const confirmAdd = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/org-management/add-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: selectedUser,
          orgId: selectedOrg
        })
      })
      
      const data = await response.json()
      
      console.log('📡 Server response:', { status: response.status, data })
      
      if (!response.ok) {
        const errorMsg = data.error || 'Failed to add access'
        console.error('❌ Add failed:', errorMsg)
        setMessage({ type: 'error', text: `${errorMsg} (Status: ${response.status})` })
      } else {
        console.log('✅ Success!', data)
        // Use server's message which includes reassignment info
        const successMsg = data.message || `✅ Added ${selectedUser} to ${selectedOrg}`
        setMessage({ type: 'success', text: successMsg })
        setSelectedUser('')
        setSelectedOrg('')
        setUserSearch('')
        setOrgSearch('')
        setCurrentOrg(null)
        setShowConfirm(false)
        setExistingMapping(null)
        loadMappings() // Refresh list
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add access' })
    } finally {
      setLoading(false)
    }
  }
  
  const handleRemove = async (userId: string, orgId: string, email: string) => {
    if (!confirm(`Remove ${email} from ${orgId}?`)) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/org-management/remove-access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orgId })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Removed ${email} from ${orgId}` })
        loadMappings()
      } else {
        setMessage({ type: 'error', text: 'Failed to remove access' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove access' })
    } finally {
      setLoading(false)
    }
  }
  
  const filteredUsers = users.filter(u => 
    u.toLowerCase().includes(userSearch.toLowerCase())
  )
  
  const filteredOrgs = orgs.filter(o => 
    o.toLowerCase().includes(orgSearch.toLowerCase())
  )
  
  // Filter mappings by org if filter is active
  const filteredMappings = filterOrg 
    ? mappings.filter(m => m.orgId.toLowerCase().includes(filterOrg.toLowerCase()))
    : mappings
  
  // Group mappings by org
  const groupedByOrg = mappings.reduce((acc: any, mapping) => {
    if (!acc[mapping.orgId]) {
      acc[mapping.orgId] = []
    }
    acc[mapping.orgId].push(mapping)
    return acc
  }, {})
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Organization Access Management
        </CardTitle>
        <CardDescription>
          Add Sixtyfour team members to customer organizations for support/debugging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Current Org Access List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Current Organization Access ({filteredMappings.length})</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={groupByOrg ? 'default' : 'outline'}
                onClick={() => setGroupByOrg(!groupByOrg)}
              >
                {groupByOrg ? 'Show All' : 'Group by Org'}
              </Button>
            </div>
          </div>
          
          {/* Filter input */}
          <div className="mb-3">
            <Input
              placeholder="Filter by org or email..."
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
              className="text-sm"
            />
          </div>
          
          <div className="border rounded-md divide-y max-h-[180px] overflow-y-auto">
            {groupByOrg ? (
              // Grouped by organization view
              Object.entries(groupedByOrg)
                .filter(([orgId]) => orgId.toLowerCase().includes(filterOrg.toLowerCase()))
                .sort(([, a]: any, [, b]: any) => b.length - a.length)
                .map(([orgId, orgMappings]: any) => (
                  <div key={orgId} className="p-3">
                    <div className="font-semibold text-sm mb-2 flex items-center justify-between">
                      <span>{orgId}</span>
                      <Badge variant="secondary">{orgMappings.length} users</Badge>
                    </div>
                    <div className="space-y-1 pl-4">
                      {orgMappings.map((mapping: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-1 hover:bg-muted/50 px-2 rounded">
                          <span className="text-muted-foreground">{mapping.email}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemove(mapping.userId, mapping.orgId, mapping.email)}
                            disabled={loading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              // Regular list view (filtered)
              filteredMappings.length > 0 ? (
                filteredMappings.map((mapping, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{mapping.email}</p>
                      <p className="text-xs text-muted-foreground">→ {mapping.orgId}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(mapping.userId, mapping.orgId, mapping.email)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">
                    {filterOrg ? 'No matches found' : 'No org access mappings'}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
        
        {/* Add User Form */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold mb-4">Add New User to Organization</h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label>User Email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Start typing email..."
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value)
                    setUserSearch(e.target.value)
                  }}
                  className="pl-10"
                />
                {/* Custom dropdown suggestions */}
                {userSearch && filteredUsers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {filteredUsers.slice(0, 10).map(email => (
                      <div
                        key={email}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedUser(email)
                          setUserSearch('')
                        }}
                      >
                        {email}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Current Organization Display */}
            <div className="space-y-2">
              <Label>Current Organization</Label>
              <div className="relative">
                {currentOrg ? (
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                    <Badge variant="secondary" className="text-sm">
                      {currentOrg}
                    </Badge>
                  </div>
                ) : (
                  <div className="h-10 px-3 py-2 border rounded-md bg-background flex items-center text-sm text-muted-foreground">
                    {selectedUser ? 'No org assigned' : 'Select user first'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Org Selection */}
            <div className="space-y-2">
              <Label>New Organization</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Start typing org name..."
                  value={selectedOrg}
                  onChange={(e) => {
                    setSelectedOrg(e.target.value)
                    setOrgSearch(e.target.value)
                  }}
                  className="pl-10"
                />
                {/* Custom dropdown suggestions */}
                {orgSearch && filteredOrgs.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {filteredOrgs.slice(0, 10).map(org => (
                      <div
                        key={org}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedOrg(org)
                          setOrgSearch('')
                        }}
                      >
                        {org}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Selection Summary */}
          {(selectedUser || selectedOrg) && (
            <div className="mt-4 p-3 bg-background border rounded-md">
              <p className="text-sm">
                {currentOrg && currentOrg !== selectedOrg ? (
                  <>
                    <span className="text-muted-foreground">Moving:</span>{' '}
                    <span className="font-medium">{selectedUser || '(select user)'}</span>
                    {' from '}
                    <Badge variant="secondary" className="mx-1">{currentOrg}</Badge>
                    {' to '}
                    <Badge variant="secondary" className="mx-1">{selectedOrg || '(select org)'}</Badge>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Adding:</span>{' '}
                    <span className="font-medium">{selectedUser || '(select user)'}</span>
                    {' → '}
                    <span className="font-medium">{selectedOrg || '(select org)'}</span>
                  </>
                )}
              </p>
            </div>
          )}
          
          {/* Add Button */}
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={handleAdd}
              disabled={!selectedUser || !selectedOrg || loading}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Access
            </Button>
            
            {(selectedUser || selectedOrg) && (
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedUser('')
                  setSelectedOrg('')
                  setUserSearch('')
                  setOrgSearch('')
                  setCurrentOrg(null)
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className={`border-2 rounded-lg p-4 ${
            existingMapping 
              ? 'border-red-500 bg-red-50 dark:bg-red-950' 
              : 'border-orange-500 bg-orange-50 dark:bg-orange-950'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${
                existingMapping ? 'text-red-600' : 'text-orange-600'
              }`} />
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  existingMapping 
                    ? 'text-red-900 dark:text-red-100' 
                    : 'text-orange-900 dark:text-orange-100'
                }`}>
                  {existingMapping ? '⚠️ Confirm Reassignment' : 'Confirm Access Addition'}
                </h4>
                <p className={`text-sm mt-1 ${
                  existingMapping 
                    ? 'text-red-800 dark:text-red-200' 
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {existingMapping ? (
                    <>
                      <strong>{selectedUser}</strong> is currently in <strong>{existingMapping}</strong>.
                      <br />
                      <strong>This will MOVE them</strong> from <strong>{existingMapping}</strong> to <strong>{selectedOrg}</strong>.
                    </>
                  ) : (
                    <>
                      Add <strong>{selectedUser}</strong> to organization <strong>{selectedOrg}</strong>?
                    </>
                  )}
                </p>
                <p className={`text-xs mt-2 ${
                  existingMapping 
                    ? 'text-red-700 dark:text-red-300' 
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {existingMapping 
                    ? 'Each user can only be in one organization. They will lose access to the previous organization.'
                    : 'This will grant them access to this organization\'s data and workflows.'
                  }
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={confirmAdd}
                    disabled={loading}
                    variant={existingMapping ? 'destructive' : 'default'}
                  >
                    {loading 
                      ? (existingMapping ? 'Moving...' : 'Adding...') 
                      : (existingMapping ? 'Confirm Move' : 'Confirm')
                    }
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowConfirm(false)
                      setExistingMapping(null)
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Success/Error Messages */}
        {message && (
          <div className={`p-3 rounded-md border ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}
        
      </CardContent>
    </Card>
  )
}

