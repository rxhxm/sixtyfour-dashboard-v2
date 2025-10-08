# Security Audit - Platform Access & Credits Management

**Date:** October 7, 2025  
**Scope:** New Platform Access and Credits Management features

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **No API Route Authentication** 
**Risk Level: CRITICAL**

**Issue:**
- `/api/credits` and `/api/posthog/feature-flags` have NO authentication
- Anyone who knows the URL can:
  - Add unlimited credits to any user
  - Remove credits from users
  - Modify PostHog feature flags
  - View all user data

**Current Code:**
```typescript
// /api/credits/route.ts - Line 57
export async function POST(request: NextRequest) {
  // NO AUTH CHECK - ANYONE CAN CALL THIS
  const { org_id, amount, operation } = await request.json()
  // ... updates database directly
}
```

**How to Exploit:**
```bash
curl -X POST http://your-domain.com/api/credits \
  -H "Content-Type: application/json" \
  -d '{"org_id":"any-user","amount":1000000,"operation":"add"}'
```

**Fix Required:**
Add NextAuth session validation to both API routes:
```typescript
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of code
}
```

---

### 2. **Client-Side Only Authentication**
**Risk Level: CRITICAL**

**Issue:**
- Authentication uses `sessionStorage.getItem("authenticated")`
- This is client-side and can be bypassed in browser console:
```javascript
sessionStorage.setItem("authenticated", "true")
// Now you're "authenticated"
```

**Current Code:**
```typescript
// All pages use this:
const isAuthenticated = sessionStorage.getItem("authenticated")
if (isAuthenticated !== "true") {
  router.push("/auth/signin")
}
```

**Fix Required:**
Use NextAuth's `useSession()` hook instead:
```typescript
import { useSession } from "next-auth/react"

const { data: session, status } = useSession({
  required: true,
  onUnauthenticated() {
    router.push("/auth/signin")
  }
})
```

---

## 🟡 HIGH PRIORITY ISSUES

### 3. **No Rate Limiting**
**Risk Level: HIGH**

**Issue:**
- No protection against:
  - Spam requests to credits API
  - Brute force on PostHog updates
  - DoS attacks

**Fix Required:**
Implement rate limiting middleware or use Vercel's rate limiting

---

### 4. **No Audit Logging**
**Risk Level: HIGH**

**Issue:**
- No record of who added/removed credits
- No timestamp of changes
- Can't track abuse or mistakes

**Fix Required:**
Create an `audit_logs` table:
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50),
  user_email VARCHAR(255),
  target_org_id VARCHAR(255),
  amount_changed INTEGER,
  old_balance INTEGER,
  new_balance INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

Log every credit change in the API route.

---

### 5. **Input Validation Gaps**
**Risk Level: MEDIUM**

**Issues:**
- `limit` and `offset` parameters not bounded (could request 999999999)
- No max credit amount limit (could add $999,999,999)
- `org_id` not sanitized (though Supabase protects from SQL injection)

**Fix Required:**
```typescript
// Add max limits
const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 10000)
const amount = Math.min(body.amount, 1000000) // Max $10,000 per transaction
```

---

### 6. **Error Messages Expose Internal Details**
**Risk Level: MEDIUM**

**Issue:**
Error messages expose database structure and internal errors:
```typescript
{ error: 'Failed to fetch subscriptions', details: error.message }
```

**Fix Required:**
In production, hide details:
```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
} else {
  return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 })
}
```

---

## 🟢 GOOD SECURITY PRACTICES (Already Implemented)

✅ **API Keys Server-Side Only**
- All sensitive keys in environment variables
- Never exposed to client-side code

✅ **Supabase Parameterized Queries**
- Using `.eq()`, `.select()` prevents SQL injection
- Supabase's query builder is safe

✅ **User Confirmation Required**
- Credits require typing exact confirmation text
- Prevents accidental changes

✅ **No Negative Balances**
- Math.max(0, ...) prevents negative credits

✅ **HTTPS by Default**
- Next.js on Vercel uses HTTPS automatically

---

## 🔒 RECOMMENDED SECURITY IMPROVEMENTS

### Priority 1: Add Server-Side Authentication (CRITICAL)
```typescript
// middleware.ts - Add this route protection
export const config = {
  matcher: ['/api/credits/:path*', '/api/posthog/:path*']
}

export async function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.next()
}
```

### Priority 2: Add Audit Logging
Log every credit transaction to track who did what.

### Priority 3: Add Rate Limiting
```typescript
// Use Vercel rate limiting or implement simple in-memory cache
const rateLimits = new Map<string, number>()
// Allow max 10 requests per minute per IP
```

### Priority 4: Add Transaction Limits
```typescript
const MAX_CREDIT_AMOUNT = 1000000 // $10,000 max per transaction
const MAX_DAILY_TOTAL = 10000000 // $100,000 max per day
```

### Priority 5: Add Email Notifications
Send email alert when:
- Credits over $1,000 are added
- Feature flag is modified
- Multiple failed attempts

### Priority 6: Add RBAC (Role-Based Access Control)
Not all authenticated users should:
- Manage credits
- Modify PostHog flags

Create admin-only routes:
```typescript
const ADMIN_EMAILS = ['saarth@sixtyfour.ai', 'roham@sixtyfour.ai']
if (!ADMIN_EMAILS.includes(session.user.email)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## 📊 SECURITY SCORE

**Current State:**
- 🔴 Critical: 2 issues
- 🟡 High: 4 issues
- 🟢 Good: 5 practices

**Risk Summary:**
Your current implementation is functional but **publicly accessible**. The biggest risk is that **anyone can modify credits and feature flags** if they know the API endpoints.

**Recommended Action:**
Implement Priority 1 (Server-Side Auth) **immediately before deploying to production**.

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to Vercel:

- [ ] Add server-side authentication to API routes
- [ ] Set up audit logging table
- [ ] Add rate limiting
- [ ] Test authentication flow
- [ ] Add max transaction limits
- [ ] Set up monitoring/alerts
- [ ] Review all environment variables
- [ ] Enable Vercel security headers

---

## 💡 QUICK WIN

The fastest security improvement (5 minutes):

**Add this to BOTH API routes:**
```typescript
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

// Add at the start of GET and POST functions:
const session = await getServerSession(authOptions)
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

This will prevent unauthorized access immediately.

