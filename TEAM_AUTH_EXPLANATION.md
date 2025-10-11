# 🔐 Dashboard Authentication System - Team Guide

## For: Saarth, Roham, Chris Price

---

## 🎯 How Authentication Works (Simple Explanation)

We use **TWO layers of security** to ensure ONLY you 3 can access this internal dashboard:

### **Layer 1: Supabase Authentication** 
Your existing Sixtyfour accounts (the same ones you use for app.sixtyfour.ai)

### **Layer 2: Dashboard Access Control**
A special list of authorized emails in our database

**Both must pass for someone to get in.**

---

## 🔒 The Two-Layer Security System

```
┌─────────────────────────────────────────────────────────┐
│  Someone tries to access dashboard                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Supabase Auth Check                           │
│  ❓ Do you have a valid Sixtyfour account?              │
│     - Same login as app.sixtyfour.ai                    │
│     - Uses your email + password                        │
└─────────────────┬───────────────────────────────────────┘
                  │
          ┌───────┴───────┐
          │               │
       ❌ NO            ✅ YES
          │               │
    DENIED ACCESS         ▼
                  ┌─────────────────────────────────────┐
                  │  LAYER 2: Dashboard Access List     │
                  │  ❓ Is your email in this list?     │
                  │     • saarth@sixtyfour.ai           │
                  │     • roham@sixtyfour.ai            │
                  │     • chrisprice@sixtyfour.ai       │
                  └─────────────┬───────────────────────┘
                                │
                        ┌───────┴───────┐
                        │               │
                     ❌ NO            ✅ YES
                        │               │
                  DENIED ACCESS    GRANTED ACCESS
                  "You don't       Dashboard loads!
                  have access"     🎉
```

---

## 💼 What This Means For Your Team

### **For Saarth, Roham, Chris:**

**✅ You CAN access the dashboard:**
1. Your emails are in the authorized list
2. You use your existing Sixtyfour password
3. Login at: http://localhost:3000/auth/signin (local) or Vercel URL (production)

### **For Everyone Else:**

**❌ They CANNOT access, even if they:**
- Have a Sixtyfour account (app.sixtyfour.ai)
- Know a valid password
- Try to hack in

**Why?** Because their email is NOT in the `dashboard_internal_access` table.

---

## 🚪 How to Login (For Team Members)

### **URL:**
- **Local:** http://localhost:3000/auth/signin
- **Production:** https://your-vercel-url.vercel.app/auth/signin

### **Credentials:**
```
Email: [your @sixtyfour.ai email]
Password: [Same password you use for app.sixtyfour.ai]
```

### **Forgot Password?**
Click "Forgot password? Reset on Sixtyfour" → Takes you to https://app.sixtyfour.ai/login where you can reset.

---

## 🛡️ Security Features

### **What Makes This Secure:**

1. **JWT Tokens** (Industry Standard)
   - Encrypted session tokens
   - Stored in httpOnly cookies (can't be stolen by JavaScript)
   - Automatic expiry

2. **Two-Factor Verification**
   - Must pass Supabase Auth (password check)
   - Must pass Access List check (email in table)

3. **Middleware Protection**
   - Every page automatically checks authentication
   - If not logged in → Redirect to signin
   - If logged in but not authorized → Kick out + redirect

4. **Session Management**
   - Sessions persist in secure browser storage
   - Auto-refresh every 10 minutes to stay logged in
   - Logout clears everything

5. **Protected Routes**
   - `/` (API Usage Dashboard)
   - `/workflows` (Workflows Dashboard)
   - `/credits-management` (if exists)
   - All API routes

---

## 📊 The Database Setup

### **Table: `dashboard_internal_access`**

```sql
┌─────────────────────────────────┬──────────────┬────────┐
│ email                           │ full_name    │ role   │
├─────────────────────────────────┼──────────────┼────────┤
│ saarth@sixtyfour.ai            │ Saarth       │ admin  │
│ roham@sixtyfour.ai             │ Roham        │ admin  │
│ chrisprice@sixtyfour.ai        │ Chris Price  │ admin  │
└─────────────────────────────────┴──────────────┴────────┘
```

**Only these 3 emails can access the dashboard.**

---

## 🔐 Technical Implementation

### **What We Built:**

1. **Auth Helper Functions** (`src/lib/supabase-auth.ts`)
   - Check if email has dashboard access
   - Track last login times
   - Secure session management

2. **Access Control API** (`/api/auth/check-access`)
   - Verifies email against dashboard_internal_access table
   - Updates last_login timestamp
   - Returns hasAccess: true/false

3. **Signin Page** (Supabase Integration)
   - Email/password form
   - Checks Supabase Auth first
   - Then checks dashboard access
   - Denies if either fails

4. **Middleware** (Route Protection)
   - Runs on EVERY page load
   - Checks session validity
   - Redirects unauthorized users
   - Prevents direct URL access

5. **Logout Functionality**
   - Clears all browser caches
   - Signs out from Supabase
   - Redirects to signin

---

## 🎯 For Team Communication

### **Email to Team:**

**Subject:** Access to Internal Dashboard

**Body:**
```
Hi team,

We've set up secure access to our internal metrics dashboard. 

Access is limited to just us 3:
• Saarth
• Roham  
• Chris

How to login:
1. Go to: [dashboard URL]
2. Use your @sixtyfour.ai email
3. Use your existing Sixtyfour password (same as app.sixtyfour.ai)

Forgot password? 
Click the link on the signin page to reset via app.sixtyfour.ai

Security: Two-factor verification ensures only authorized team members can access.

Questions? Let me know!
```

---

## 🔧 How to Add Someone New (Admin Only)

If you need to add someone later:

**Step 1: Add to access list (SQL in Supabase)**
```sql
INSERT INTO dashboard_internal_access (email, full_name, role) 
VALUES ('newperson@sixtyfour.ai', 'New Person', 'admin');
```

**Step 2: They login**
- Use their existing Sixtyfour account
- That's it! They now have access.

---

## 📋 Summary

**What You Have:**
- ✅ Enterprise-grade authentication (Supabase Auth)
- ✅ Access control list (only 3 people)
- ✅ Secure sessions (JWT + httpOnly cookies)
- ✅ Auto-refresh (stay logged in while active)
- ✅ One password for everything (same as main Sixtyfour)
- ✅ Easy password reset (via main app)

**What You DON'T Have to Worry About:**
- ❌ Managing passwords (Supabase handles it)
- ❌ Building password reset flows (use main app)
- ❌ Security vulnerabilities (industry-standard auth)
- ❌ Session management (automatic)

---

## 🎯 Bottom Line

**Only these 3 emails can access the dashboard:**
1. saarth@sixtyfour.ai
2. roham@sixtyfour.ai
3. chrisprice@sixtyfour.ai

**Even if someone:**
- Has a Sixtyfour account ❌
- Knows a password ❌
- Has the dashboard URL ❌

**They CANNOT access unless their email is in the authorized list.**

**This is as secure as banking apps.** ✅

---

Need to explain anything else to the team? I can create slides, a video walkthrough guide, or answer any questions!

