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
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  
  // Load data on mount
  useEffect(() => {
    loadUsers()
    loadOrgs()
    loadMappings()
  }, [])
  
  const loadUsers = async () => {
    // Load from org-emails API which already fetches all 631 users
    const response = await fetch('/api/org-emails')
    const data = await response.json()
    
    // Extract unique emails from the mapping
    const emails = Object.values(data.emailMap || {})
    setUsers([...new Set(emails)] as any[])
  }
  
  const loadOrgs = async () => {
    const response = await fetch('/api/org-management/valid-orgs')
    const data = await response.json()
    setOrgs(data.orgs || [])
  }
  
  const loadMappings = async () => {
    const { data } = await fetch('/api/org-emails').then(r => r.json())
    // Convert emailMap to array for display
    const mappingArray = Object.entries(data?.emailMap || {}).map(([orgId, email]) => ({
      orgId,
      email
    }))
    setMappings(mappingArray)
  }
  
  const handleAdd = () => {
    if (!selectedUser || !selectedOrg) {
      setMessage({ type: 'error', text: 'Please select both user and organization' })
      return
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
      
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to add access' })
      } else {
        setMessage({ type: 'success', text: `✅ Added ${selectedUser} to ${selectedOrg}` })
        setSelectedUser('')
        setSelectedOrg('')
        setShowConfirm(false)
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
        
        {/* Add User Form */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold mb-4">Add User to Organization</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label>User Email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type email address..."
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="pl-10"
                  list="user-list"
                />
                <datalist id="user-list">
                  {filteredUsers.slice(0, 100).map(email => (
                    <option key={email} value={email} />
                  ))}
                </datalist>
              </div>
            </div>
            
            {/* Org Selection */}
            <div className="space-y-2">
              <Label>Organization</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type organization name..."
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="pl-10"
                  list="org-list"
                />
                <datalist id="org-list">
                  {filteredOrgs.slice(0, 100).map(org => (
                    <option key={org} value={org} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
          
          {/* Selection Summary */}
          {(selectedUser || selectedOrg) && (
            <div className="mt-4 p-3 bg-background border rounded-md">
              <p className="text-sm">
                <span className="text-muted-foreground">Adding:</span>{' '}
                <span className="font-medium">{selectedUser || '(select user)'}</span>
                {' → '}
                <span className="font-medium">{selectedOrg || '(select org)'}</span>
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
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="border-2 border-orange-500 rounded-lg p-4 bg-orange-50 dark:bg-orange-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                  Confirm Access Addition
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                  Add <strong>{selectedUser}</strong> to organization <strong>{selectedOrg}</strong>?
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                  This will grant them access to this organization's data and workflows.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={confirmAdd}
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Confirm'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
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
        
        {/* Current Access List */}
        <div>
          <h3 className="font-semibold mb-3">Current Organization Access ({mappings.length})</h3>
          <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
            {mappings.length > 0 ? (
              mappings.map((mapping, idx) => (
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
                <p>No org access mappings found</p>
              </div>
            )}
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
}

