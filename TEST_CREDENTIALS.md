# 🔐 Test Credentials for Dashboard

## Authorized Users

All 3 team members can now log in with their Supabase Auth accounts:

| Email | Name | Status |
|-------|------|--------|
| `saarth@sixtyfour.ai` | Saarth | ✅ Active |
| `roham@sixtyfour.ai` | Roham | ✅ Active |
| `chrisprice@sixtyfour.ai` | Chris Price | ✅ Active |

## How to Test

### **If Users Already Have Passwords:**
1. Go to http://localhost:3000/auth/signin
2. Enter email (e.g., `saarth@sixtyfour.ai`)
3. Enter their existing Supabase password
4. Click "Sign In"
5. Should load dashboard instantly!

### **If Users Need to Set Password (First Time):**
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: Authentication → Users
3. Find the user email
4. Click "..." → "Send password reset email"
5. User gets email with reset link
6. User sets their own password
7. Then can log in to dashboard

### **For Quick Testing (Temporary Password):**
If you want to test right now, you can set a temporary password:
1. Go to Supabase → Authentication → Users
2. Find user (e.g., saarth@sixtyfour.ai)
3. Click "..." → "Reset password"
4. Set temporary password: `Test123!` (or any strong password)
5. Test login with that password

## What Changed

### **Old System:**
- ❌ One hardcoded password for everyone
- ❌ No individual accounts
- ❌ No session management
- ❌ sessionStorage only

### **New System:**
- ✅ Individual accounts for each person
- ✅ Secure Supabase Auth
- ✅ Proper session management (JWT tokens)
- ✅ httpOnly cookies (can't be stolen by JavaScript)
- ✅ Middleware protection on all routes
- ✅ Browser caching with secure sessions
- ✅ Auto-refresh every 10 minutes
- ✅ Logout works properly

## Security Features

- 🔒 **JWT tokens** stored in httpOnly cookies (XSS protection)
- 🔒 **Middleware** checks auth on every page
- 🔒 **Access control** table verifies dashboard permission
- 🔒 **Session expiry** (configurable, default 7 days)
- 🔒 **HTTPS only** in production (Vercel handles this)
- 🔒 **Rate limiting** built into Supabase Auth

## Next Steps

1. **Test locally** with one email
2. **Send password reset emails** to all 3 team members
3. **Have them set their own passwords**
4. **Deploy to Vercel**
5. **Team can access with their own credentials**

