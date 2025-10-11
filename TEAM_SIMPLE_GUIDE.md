# Dashboard Access - Quick Guide

## 🔑 Who Has Access

**ONLY these 3 people:**
1. **Saarth** (saarth@sixtyfour.ai)
2. **Roham** (roham@sixtyfour.ai)
3. **Chris Price** (chrisprice@sixtyfour.ai)

**NO ONE ELSE can access this dashboard.**

---

## 🚪 How to Login

**URL:** http://localhost:3000/auth/signin (or production Vercel URL)

**Credentials:**
- **Email:** Your @sixtyfour.ai email
- **Password:** Same password you use for app.sixtyfour.ai

**That's it!** Use your existing Sixtyfour account password.

---

## 🔒 How Security Works (For Your Team)

### **Think of it like a building with 2 doors:**

**Door 1: Main Building (Supabase Auth)**
- You need your Sixtyfour email + password
- This is the same as app.sixtyfour.ai login
- Thousands of users have keys to this door

**Door 2: Executive Suite (Dashboard Access List)**
- Even if you got through Door 1...
- You still need your name on "The List"
- **ONLY 3 names are on the list:** Saarth, Roham, Chris
- Everyone else gets kicked out

### **Example Scenarios:**

**✅ Roham logs in:**
```
1. Enters roham@sixtyfour.ai + password
2. Door 1: "Valid Sixtyfour account!" → Opens ✅
3. Door 2: Checks list... "Roham? Yes, he's on the list!" → Opens ✅
4. ACCESS GRANTED 🎉
```

**❌ Random customer logs in:**
```
1. Enters customer@example.com + password
2. Door 1: "Valid Sixtyfour account!" → Opens ✅
3. Door 2: Checks list... "Not on the list!" → DENIED ❌
4. Kicked out + Error message: "You don't have access to this dashboard"
```

**❌ Hacker tries:**
```
1. Enters fake@example.com + guessed password
2. Door 1: "Invalid password!" → DENIED ❌
3. Never even gets to Door 2
```

---

## 🛠️ What We Built (Technical)

### **Database Table:**
```
Table: dashboard_internal_access
Authorized emails list:
├─ saarth@sixtyfour.ai
├─ roham@sixtyfour.ai
└─ chrisprice@sixtyfour.ai
```

### **Authentication Flow:**
```typescript
1. User enters email + password
   ↓
2. Supabase Auth: Validates credentials
   ↓
3. If valid → Check dashboard_internal_access table
   ↓
4. If email in table → Access granted ✅
   If email NOT in table → Sign out + deny ❌
```

### **Protection:**
- All pages protected by middleware
- Can't bypass by going directly to URL
- Session expires after period of inactivity
- Logout clears all cached data

---

## 🔐 Password Management

### **Your Password:**
- **Same as:** app.sixtyfour.ai
- **One password** for both systems
- **Forgot it?** Reset at https://app.sixtyfour.ai/login

### **Security Features:**
- Passwords never stored in plain text
- Encrypted JWT tokens
- httpOnly cookies (XSS protection)
- Automatic session refresh
- Secure logout

---

## ➕ Adding New Team Members (If Needed)

**To give someone else access:**

1. **Add their email to the database:**
   ```sql
   INSERT INTO dashboard_internal_access (email, full_name, role) 
   VALUES ('newperson@sixtyfour.ai', 'New Person', 'admin');
   ```

2. **They login:**
   - Use their existing Sixtyfour account
   - That's it!

3. **To remove someone:**
   ```sql
   DELETE FROM dashboard_internal_access 
   WHERE email = 'person@sixtyfour.ai';
   ```

---

## 📧 Email Template for Team

```
Subject: Access to Internal Analytics Dashboard

Hi Saarth, Roham, Chris,

You now have access to our internal analytics dashboard for monitoring:
• API usage metrics
• Workflow executions
• User activity

Login: [dashboard URL]
Credentials: Your @sixtyfour.ai email + existing Sixtyfour password

This dashboard is internal-only. Access is restricted to just us 3 for security.

Forgot password? Use the "Forgot password?" link to reset via app.sixtyfour.ai

Questions? Let me know!
```

---

## 🎯 Key Talking Points

**For explaining to team:**

1. **"It uses your existing Sixtyfour account"**
   - No new password to remember
   - Same login as main app

2. **"Only us 3 can access"**
   - Security whitelist in database
   - Everyone else automatically denied

3. **"Professional security"**
   - Same auth system as banks
   - JWT tokens, encrypted sessions
   - Industry best practices

4. **"Easy to use"**
   - Login with email + password
   - Stays logged in (caches data)
   - One-click logout

---

## ✅ Summary

**Authentication Method:** Supabase Auth (same as main Sixtyfour product)

**Access Control:** Whitelist of 3 emails in database table

**Password:** Your existing Sixtyfour password

**Security Level:** Enterprise-grade (JWT, httpOnly cookies, middleware protection)

**Who Can Access:** Saarth, Roham, Chris ONLY

**How They Login:** Email + existing password at dashboard URL

**Password Reset:** Via main Sixtyfour app (app.sixtyfour.ai/login)

---

Need me to create slides, a video script, or simplify this further? Let me know! 🚀

