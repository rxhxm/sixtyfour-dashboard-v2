# 📊 Signup Report: November 9-16, 2025

**Report Generated:** November 17, 2025  
**Date Range:** November 9, 2025 - November 16, 2025

---

## 🎯 Executive Summary

### API Signups (auth.users)
- **Total API signups:** **28 users**
- **Date range:** Nov 9, 2025 00:00 UTC → Nov 16, 2025 23:59 UTC
- **All users authenticated via:** Google OAuth (25 users) and Email (3 users)

### Interest Form / Waitlist
- **No interest form data found in Supabase**
- `waitlist` table: Does NOT exist
- `leads` table: Exists but EMPTY (0 records)
- Other checked tables: None contain form submissions

### LinkedIn Referrals
- **0 users** mentioned LinkedIn in their signup metadata
- No referral source tracking found in user profiles
- No UTM parameters or signup source fields detected

---

## 📋 Detailed Breakdown

### 1. API Signups by Date

| Date | Signups | % of Total |
|------|---------|-----------|
| Nov 9 | 1 | 3.6% |
| Nov 10 | 7 | 25.0% |
| Nov 11 | 5 | 17.9% |
| Nov 12 | 5 | 17.9% |
| Nov 13 | 6 | 21.4% |
| Nov 14 | 1 | 3.6% |
| Nov 15 | 4 | 14.3% |
| Nov 16 | 2 | 7.1% |
| **Total** | **28** | **100%** |

### 2. All 28 Signups (Chronological)

1. `amin.nas@gmail.com` - Nov 9, 8:53 AM
2. `pranavlende123@gmail.com` - Nov 10, 4:49 PM
3. `sam.arenson@synthesia.io` - Nov 10, 8:51 AM
4. `deepaksangleok@gmail.com` - Nov 10, 10:25 AM
5. `nejda25@gmail.com` - Nov 10, 2:47 PM
6. `sujguh@gmail.com` - Nov 10, 5:19 PM
7. `bruhpogger69421@gmail.com` - Nov 10, 6:17 PM
8. `santillanablair@gmail.com` - Nov 10, 6:34 PM
9. `narzaryblessing@gmail.com` - Nov 10, 7:16 PM
10. `pss9179@stern.nyu.edu` - Nov 11, 12:51 AM
11. `hasnain323@gmail.com` - Nov 11, 9:47 AM
12. `vimalrajvasu10@gmail.com` - Nov 12, 10:13 AM
13. `rl4917@nyu.edu` - Nov 12, 1:40 PM
14. `shrey@lunchlinepartners.com` - Nov 12, 3:00 PM
15. `isaac@retrofix.ai` - Nov 12, 3:36 PM
16. `rehanul@gasolinetalent.com` - Nov 12, 4:40 PM
17. `applydks@gmail.com` - Nov 13, 1:08 AM
18. `sumonigupta@gmail.com` - Nov 13, 1:18 AM
19. `nikhilprabhu06@gmail.com` - Nov 13, 7:13 AM
20. `winsontang2003@gmail.com` - Nov 13, 11:36 AM
21. `zteisenmann@gmail.com` - Nov 13, 12:09 PM
22. `shehryar.bajwa@gmail.com` - Nov 14, 2:46 PM
23. `vdubey@plexe.ai` - Nov 15, 6:03 AM
24. `andrew@arenavs.com` - Nov 15, 7:49 AM
25. `pandyamk27@gmail.com` - Nov 15, 9:45 AM
26. `nguyen15@kenyon.edu` - Nov 15, 10:03 AM
27. `courtne@lyra.so` - Nov 16, 8:15 AM
28. `kacem.mathlouthi@insat.ucar.tn` - Nov 16, 3:26 PM

### 3. Notable Companies/Domains

- **Synthesia.io** - AI video platform
- **Lyra.so** - Product analytics
- **Retrofix.ai** - AI company
- **Plexe.ai** - AI company
- **Arenavs.com** - Company
- **Gasolinetalent.com** - Talent agency
- **Lunchlinepartners.com** - Partnership firm
- **NYU Students** - 2 signups (stern.nyu.edu, nyu.edu)
- **Kenyon College** - 1 signup

---

## 🔍 Database Structure Findings

### Tables Checked:
✅ **Found and queried:**
- `organizations` - 816 records
- `api_keys` - 312 records
- `api_usage` - 3,336,721 records
- `users-org` - 659 records
- `api_subscriptions` - 815 records
- `leads` - 0 records (EMPTY)

❌ **Does NOT exist:**
- `waitlist` 
- `interest_forms`
- `signups`
- `contacts`
- `submissions`
- `form_submissions`
- `contact_forms`
- `early_access`
- `beta_signups`
- `marketing_leads`
- `prospects`

### User Metadata Analysis:
- ✅ All users have basic Google OAuth data (name, email, avatar)
- ❌ NO referral source tracking
- ❌ NO UTM parameters
- ❌ NO signup source fields
- ❌ NO "how did you hear about us" data
- ❌ NO LinkedIn mentions in any user metadata

---

## 💡 Conclusions

### API Signups
✅ **28 users** signed up for API access between Nov 9-16, 2025  
✅ Data confirmed and exported to CSV

### Interest Form
❌ **No interest form data** exists in this Supabase database  
❌ If an interest form exists, it's likely:
- External service (Typeform, Google Forms, Airtable, etc.)
- Different Supabase project
- Marketing automation tool (HubSpot, Mailchimp, etc.)
- Landing page builder (Webflow, Framer, etc.)

### LinkedIn Tracking
❌ **0 users** have LinkedIn as referral source  
❌ No referral tracking is currently implemented in the signup flow

---

## 📁 Exported Files

1. `signups-nov9-16-2025.csv` - Basic signup list (28 users)
2. `signups-detailed-nov9-16-2025.csv` - Detailed metadata export

---

## 🎯 Recommendations

1. **For Interest Form Data:**
   - Check external form services (Typeform, Google Forms, etc.)
   - Review marketing tools (HubSpot, Mailchimp)
   - Check landing page analytics

2. **For LinkedIn Tracking:**
   - Implement UTM parameter tracking in signup flow
   - Add "How did you hear about us?" field to registration
   - Set up Google Analytics or PostHog event tracking

3. **For Better Analytics:**
   - Add referral source field to user signup
   - Track UTM parameters during registration
   - Store marketing attribution data in Supabase

