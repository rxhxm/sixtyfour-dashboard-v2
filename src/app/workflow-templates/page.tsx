'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutTemplate, 
  Building2, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Blocks,
  ArrowRight,
  User,
  Clock,
  Star
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'

interface Block {
  block_name: string
  block_type: string
  sequence_number?: number
  specs?: any
}

interface Template {
  id: string
  org_id: string | null
  created_at: string
  name: string
  description?: string
  category?: string
  difficulty?: string
  estimated_time?: string
  preview_blocks?: string[]
  blocks?: Block[]
  author_name?: string
  featured?: boolean
  is_global?: boolean
}

// Block type colors
const blockTypeColors: Record<string, string> = {
  io: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  transform: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  enrich: 'bg-green-500/20 text-green-400 border-green-500/30',
  filter: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  action: 'bg-red-500/20 text-red-400 border-red-500/30',
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
}

export default function WorkflowTemplatesPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [authVerified, setAuthVerified] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [uniqueOrgs, setUniqueOrgs] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [orgFilter, setOrgFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !isAuthorizedEmail(session.user.email)) {
        if (session) await supabase.auth.signOut()
        window.location.href = '/auth/signin'
        return
      }
      setAuthVerified(true)
      setAuthChecking(false)
    }
    checkAuth()
  }, [supabase])

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (orgFilter) params.set('org', orgFilter)
      if (searchQuery) params.set('search', searchQuery)
      
      const res = await fetch(`/api/workflow-templates?${params}`)
      const data = await res.json()
      
      setTemplates(data.templates || [])
      setUniqueOrgs(data.uniqueOrgs || [])
      setTotalCount(data.totalCount || 0)
      setUnassignedCount(data.unassignedCount || 0)
      setTotalPages(data.totalPages || 1)
    } catch (e) {
      console.error('Error fetching templates:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authVerified) {
      fetchTemplates()
    }
  }, [authVerified, page, orgFilter])

  // Debounced search
  useEffect(() => {
    if (!authVerified) return
    const timer = setTimeout(() => {
      setPage(1)
      fetchTemplates()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Start editing
  const startEdit = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(template.id)
    setEditValue(template.org_id || '')
    setShowSuggestions(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
    setShowSuggestions(false)
  }

  // Save org_id
  const saveOrgId = async (templateId: string, newOrgId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/workflow-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: newOrgId || null })
      })
      const data = await res.json()
      
      if (data.success) {
        setTemplates(prev => 
          prev.map(t => t.id === templateId ? { ...t, org_id: newOrgId || null } : t)
        )
        if (newOrgId && !uniqueOrgs.includes(newOrgId)) {
          setUniqueOrgs(prev => [...prev, newOrgId].sort())
        }
        showToast(data.message, 'success')
      } else {
        showToast(data.error || 'Failed to update', 'error')
      }
    } catch (e) {
      showToast('Network error', 'error')
    } finally {
      setSaving(false)
      cancelEdit()
    }
  }

  // Toggle expanded row
  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Filter suggestions
  const filteredSuggestions = uniqueOrgs.filter(org => 
    org.toLowerCase().includes(editValue.toLowerCase())
  )

  // Get block color
  const getBlockColor = (blockType: string) => {
    return blockTypeColors[blockType] || blockTypeColors.default
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all ${
            toast.type === 'success' 
              ? 'bg-green-900/90 text-green-100 border border-green-700' 
              : 'bg-red-900/90 text-red-100 border border-red-700'
          }`}>
            {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Workflow Templates</h1>
          <p className="text-muted-foreground mt-1">Manage organization assignments and view template blocks</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueOrgs.length}</div>
            </CardContent>
          </Card>

          <Card className="border-amber-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{unassignedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by template name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={orgFilter}
                onChange={(e) => { setOrgFilter(e.target.value); setPage(1) }}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[200px]"
              >
                <option value="">All Organizations</option>
                <option value="null">⚠️ Unassigned</option>
                {uniqueOrgs.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Click a row to view blocks. Click organization to edit assignment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg overflow-hidden">
                      {/* Main Row */}
                      <div 
                        className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          expandedId === template.id ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => toggleExpanded(template.id)}
                      >
                        {/* Expand Icon */}
                        <div className="text-muted-foreground">
                          {expandedId === template.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                        
                        {/* Template Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{template.name || 'Untitled'}</span>
                            {template.featured && (
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            )}
                            {template.is_global && (
                              <Badge variant="outline" className="text-xs">Global</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {template.category && (
                              <span>{template.category}</span>
                            )}
                            {template.difficulty && (
                              <span className="px-1.5 py-0.5 rounded bg-muted">{template.difficulty}</span>
                            )}
                            {template.preview_blocks && (
                              <span className="flex items-center gap-1">
                                <Blocks className="h-3 w-3" />
                                {template.preview_blocks.length} blocks
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Organization */}
                        <div onClick={(e) => e.stopPropagation()}>
                          {editingId === template.id ? (
                            <div className="relative">
                              <div className="flex items-center gap-2">
                                <Input
                                  ref={inputRef}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onFocus={() => setShowSuggestions(true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveOrgId(template.id, editValue)
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                  placeholder="Type org name..."
                                  className="h-8 w-36"
                                  disabled={saving}
                                />
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => saveOrgId(template.id, editValue)}
                                  disabled={saving}
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              
                              {showSuggestions && filteredSuggestions.length > 0 && (
                                <div 
                                  ref={suggestionsRef}
                                  className="absolute top-full right-0 mt-1 w-44 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
                                >
                                  {filteredSuggestions.map(org => (
                                    <button
                                      key={org}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                      onClick={() => {
                                        setEditValue(org)
                                        setShowSuggestions(false)
                                      }}
                                    >
                                      {org}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button onClick={(e) => startEdit(template, e)}>
                              {template.org_id ? (
                                <Badge variant="secondary" className="hover:bg-accent cursor-pointer transition-colors">
                                  {template.org_id}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10 cursor-pointer transition-colors">
                                  Unassigned
                                </Badge>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-sm text-muted-foreground w-24 text-right">
                          {new Date(template.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Expanded Content - Blocks */}
                      {expandedId === template.id && (
                        <div className="border-t bg-muted/20 p-4">
                          {/* Template Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {template.description && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Description</p>
                                <p className="text-sm">{template.description}</p>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm">
                              {template.author_name && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  {template.author_name}
                                </div>
                              )}
                              {template.estimated_time && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {template.estimated_time}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Blocks Flow */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                              <Blocks className="h-3 w-3" />
                              Workflow Blocks
                            </p>
                            
                            {template.blocks && template.blocks.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {template.blocks
                                  .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0))
                                  .map((block, index) => (
                                    <React.Fragment key={index}>
                                      <div 
                                        className={`px-3 py-2 rounded-md border text-sm font-mono ${getBlockColor(block.block_type)}`}
                                        title={`Type: ${block.block_type}\n${block.specs ? JSON.stringify(block.specs, null, 2).slice(0, 200) : ''}`}
                                      >
                                        <div className="font-medium">{block.block_name}</div>
                                        <div className="text-xs opacity-70">{block.block_type}</div>
                                      </div>
                                      {index < template.blocks!.length - 1 && (
                                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      )}
                                    </React.Fragment>
                                  ))}
                              </div>
                            ) : template.preview_blocks && template.preview_blocks.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {template.preview_blocks.map((blockName, index) => (
                                  <React.Fragment key={index}>
                                    <div className="px-3 py-2 rounded-md border bg-slate-500/20 text-slate-400 border-slate-500/30 text-sm font-mono">
                                      {blockName}
                                    </div>
                                    {index < template.preview_blocks!.length - 1 && (
                                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No blocks defined</p>
                            )}
                          </div>

                          {/* Template ID */}
                          <div className="mt-4 pt-3 border-t">
                            <code className="text-xs text-muted-foreground font-mono">
                              ID: {template.id}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages} ({totalCount} templates)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
