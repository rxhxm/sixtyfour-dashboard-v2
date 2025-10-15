# 🚀 Resend Auto-Sync Deployment Instructions

**Audience ID:** `0c55c1d3-ba5f-4685-a8f5-2c77a5e8f4dc`  
**Project:** `iszvhmzqbaplwemstyzy`

---

## ✅ **DEPLOYMENT STEPS (Copy-Paste Ready)**

### **Step 1: Deploy Edge Function**

```bash
# Install Supabase CLI (if not already installed)
npm i -g supabase

# Login to Supabase
supabase login

# Create new function
supabase functions new add-to-resend
```

**Then replace the content of `supabase/functions/add-to-resend/index.ts` with:**

The code from `edge-function.ts` file in this folder.

**Deploy it:**

```bash
supabase functions deploy add-to-resend --project-ref iszvhmzqbaplwemstyzy --no-verify-jwt
```

**Verify it's deployed:**
- Go to: https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy/functions
- You should see `add-to-resend` listed

---

### **Step 2: Run SQL Trigger**

1. **Go to Supabase SQL Editor:**
   https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy/sql/new

2. **Paste the SQL from `sql-trigger.sql`**

3. **Click "Run"**

4. **Verify it worked:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
   Should return 1 row ✅

---

### **Step 3: Test It**

**Option A: Create a test signup (SAFE)**
```sql
-- This will trigger the sync
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-resend-sync@example.com',
  crypt('test', gen_salt('bf')),
  NOW(),
  '{"full_name": "Test User"}'::jsonb
);

-- Then DELETE the test user
DELETE FROM auth.users WHERE email = 'test-resend-sync@example.com';
```

**Option B: Wait for real signup**
- Next person who signs up will automatically sync to Resend
- Check Resend "General" audience - count should go from 360 → 361

**Option C: Check logs**
```sql
-- See if trigger fired
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;
```

---

## 🛡️ **SAFETY GUARANTEES**

1. ✅ **Only NEW signups** - existing 656 users untouched
2. ✅ **Non-blocking** - signup completes even if Resend fails
3. ✅ **No data changes** - only ADDS to Resend, never modifies Supabase
4. ✅ **Easy rollback** - can disable with one SQL command
5. ✅ **Fully logged** - all actions tracked

---

## 🔧 **TO DISABLE (If Needed)**

If something goes wrong, run this ONE command:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

This immediately stops the sync. No other changes needed.

---

## ✅ **VERIFICATION CHECKLIST**

After deployment:

- [ ] Edge Function visible in Supabase dashboard
- [ ] Trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- [ ] Test signup → appears in Resend within 30 seconds
- [ ] Check logs: `SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;`
- [ ] Production signup → syncs automatically

---

**READY TO DEPLOY! All files are in the `supabase-resend-setup/` folder.**

