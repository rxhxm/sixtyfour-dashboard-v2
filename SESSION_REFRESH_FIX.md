# 🔄 Session Refresh Fix - Prevent Stale Session Issues

## 🐛 THE PROBLEM

**Current Flow:**
```
1. User logs in → Session created (org: null, access: false)
2. Admin assigns org → Database updated ✅
3. User's browser → Still has old session (org: null) ❌
4. Features greyed out until user logs out/in
```

**Root Cause:** App checks **session** instead of **live database**

---

## ✅ SOLUTION OPTIONS

### Option 1: Real-time Database Check (RECOMMENDED)

**What:** Check database on each page load, not just session

**Where to implement:**
- `src/app/workflows/page.tsx`
- `src/app/api-usage/page.tsx`  
- Any protected page

**Code Example:**

```typescript
// Current (BAD - relies on stale session):
useEffect(() => {
  const { data: { session } } = await supabase.auth.getSession()
  const userOrg = session.user.user_metadata.org_id  // ❌ Stale!
  if (!userOrg) {
    setBlocked(true)  // Greyed out
  }
}, [])

// Fixed (GOOD - checks live database):
useEffect(() => {
  const checkLiveAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check LIVE database for org assignment
    const { data: orgMapping } = await supabase
      .from('users-org')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!orgMapping) {
      setBlocked(true)
    } else {
      setUserOrg(orgMapping.org_id)  // Use live data!
      setBlocked(false)
    }
  }
  
  checkLiveAccess()
}, [])
```

**Benefits:**
- ✅ Always shows current state
- ✅ No logout/login needed
- ✅ Instant updates after admin changes
- ⚠️  Slightly slower (extra DB query per page load)

---

### Option 2: Force Session Refresh

**What:** Automatically refresh session when detecting stale data

**Code:**

```typescript
const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession()
  if (!error && data.session) {
    // Session refreshed with latest data
    window.location.reload()
  }
}

// Call when detecting stale data
useEffect(() => {
  if (sessionLooksStale) {
    refreshSession()
  }
}, [])
```

---

### Option 3: Add "Refresh Access" Button

**What:** Let users manually refresh without full logout

**Code:**

```typescript
<Button onClick={async () => {
  await supabase.auth.refreshSession()
  window.location.reload()
}}>
  Refresh Access
</Button>
```

**Show when:** Features are greyed out

---

### Option 4: Supabase Realtime (ADVANCED)

**What:** Subscribe to users-org changes, auto-update

**Code:**

```typescript
useEffect(() => {
  const channel = supabase
    .channel('users-org-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'users-org',
      filter: `id=eq.${user.id}`
    }, (payload) => {
      // Org changed! Refresh session
      supabase.auth.refreshSession()
      window.location.reload()
    })
    .subscribe()
  
  return () => supabase.removeChannel(channel)
}, [user.id])
```

---

## 🎯 RECOMMENDED IMPLEMENTATION

**Use Option 1** - Check live database on page load

**Files to update:**
1. `src/app/workflows/page.tsx` - Check org before loading workflows
2. `src/app/api-usage/page.tsx` - Check org before loading API data
3. Any protected feature pages

**Benefits:**
- Users see changes immediately
- No manual refresh needed
- Simple implementation
- Reliable

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] Update workflows page to check live org assignment
- [ ] Update API usage page to check live org assignment
- [ ] Add loading state while checking
- [ ] Show helpful message if no org assigned
- [ ] Cache the org check result (don't query on every render)

---

**Want me to implement Option 1 across all protected pages?**



