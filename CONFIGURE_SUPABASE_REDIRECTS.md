# Configure Supabase to Use Custom Password Reset Pages

## Problem
Password reset emails redirect to Supabase hosted UI instead of your custom pages.

## Solution
Update Supabase email template redirect URLs.

### Steps:

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy/auth/url-configuration

2. **Update Site URL:**
   - Site URL: `http://localhost:3000` (for local testing)
   - For production: `https://your-vercel-app.vercel.app`

3. **Add Redirect URLs:**
   Click "Add URL" and add:
   - `http://localhost:3000/auth/update-password`
   - `http://localhost:3000/**`
   - `https://your-vercel-app.vercel.app/**`

4. **Update Email Templates:**
   Go to: https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy/auth/templates
   
   For "Reset Password" template, find the line:
   ```
   {{ .ConfirmationURL }}
   ```
   
   This should already point to your Site URL + /auth/update-password

5. **Save Changes**

## Quick Workaround (For Testing Now)

Use the Supabase hosted page to reset password:
1. On app.sixtyfour.ai/login page
2. Click "Forgot your password?"
3. Reset there
4. Use new password on localhost:3000/auth/signin

OR just try existing password if you remember it from Sixtyfour main product!

