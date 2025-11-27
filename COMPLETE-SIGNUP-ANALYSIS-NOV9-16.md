# 📊 Complete Signup Analysis: November 9-16, 2025

**Report Generated:** November 17, 2025  
**Database:** Supabase (iszvhmzqbaplwemstyzy.supabase.co)

---

## 🎯 QUICK ANSWERS

### 1. API Signups (Nov 9-16, 2025)
**✅ 28 users signed up**

### 2. Interest Form Signups
**❌ No data found** - Interest form data does NOT exist in this Supabase database

### 3. LinkedIn Referrals (Nov 9-16)
**❌ 0 users** - No LinkedIn referral tracking found in database

---

## 📊 DETAILED FINDINGS

### All-Time Totals:
- **Total API users ever:** 808 users
- **Nov 9-16, 2025:** 28 users (3.5% of total)
- **LinkedIn profiles in database:** 385,521 profiles

### Tables Found in Supabase:

| Table Name | Records | Contains |
|------------|---------|----------|
| `organizations` | 816 | Organization IDs |
| `api_keys` | 312 | API access keys |
| `api_usage` | 3,336,721 | API call logs |
| `users-org` | 659 | User-to-org mappings |
| `api_subscriptions` | 815 | Billing/credits |
| `linkedin_profiles` | 385,521 | **LinkedIn enrichment data** ✅ |
| `leads` | 0 | **EMPTY** |
| `waitlist` | 0 | **EMPTY** |
| `signups` | 0 | **EMPTY** |
| `signup_sources` | 0 | **EMPTY** |
| `user_metadata` | 0 | **EMPTY** |
| `profiles` | 0 | **EMPTY** |
| `enriched_users` | 0 | **EMPTY** |

---

## 💡 KEY DISCOVERY

### The `linkedin_profiles` Table

**✅ FOUND:** 385,521 LinkedIn profiles with rich metadata including:
- Full name, title, position
- Company information
- About/bio
- Work experience
- Education
- Location
- Activity/posts
- Connections count

**Example fields in metadata:**
```json
{
  "name": "...",
  "about": "...",
  "position": "...",
  "current_company": {
    "name": "...",
    "title": "..."
  },
  "experience": [...],
  "education": [...],
  "followers": 399,
  "connections": 399
}
```

### 🔍 What's MISSING:

1. **❌ No signup source tracking** in database
   - Tables exist (`signup_sources`, `signup_tracking`) but are EMPTY
   - Slack shows "Source: Product Hunt", "Source: Other" - not in DB

2. **❌ No user-to-LinkedIn mapping** found
   - Can't directly link auth users to LinkedIn profiles via DB query
   - No `user_id` or `email` fields in `linkedin_profiles` table

3. **❌ No revenue/investor data** in database
   - Slack shows company revenue, investors, valuations
   - This enrichment data not stored in Supabase

4. **❌ No "qualified lead" scoring** in database
   - Ari bot posts lead qualifications - not in DB

---

## 🔍 WHERE IS THE MISSING DATA?

Based on analysis, the signup source and enrichment data shown in Slack is likely:

### Option 1: **PostHog Events** (Most Likely)
- Signup sources tracked as PostHog events
- You have PostHog integration (seen in codebase)
- Event properties would include source, UTM params, etc.

### Option 2: **External Enrichment API**
- Dondi/Ari bots call enrichment API on signup
- Data sent to Slack but NOT stored in database
- Services like:
  - **Apollo.io** - B2B data & enrichment
  - **Clearbit** - Company/person enrichment
  - **ZoomInfo** - B2B contact data
  - **Hunter.io** - Email enrichment

### Option 3: **Webhook-Only Flow**
- Signup triggers webhook
- Webhook enriches data via API
- Posts to Slack
- Doesn't store in database

### Option 4: **Different Database/Service**
- Separate PostgreSQL instance
- Different Supabase project
- MongoDB/Firebase
- Airtable/Notion database

---

## 📋 THE 28 SIGNUPS (Nov 9-16, 2025)

| # | Email | Date | Company |
|---|-------|------|---------|
| 1 | `kacem.mathlouthi@insat.ucar.tn` | Nov 16 | INSAT (Student) |
| 2 | `courtne@lyra.so` | Nov 16 | **Lyra** (CEO) |
| 3 | `nguyen15@kenyon.edu` | Nov 15 | Kenyon College |
| 4 | `pandyamk27@gmail.com` | Nov 15 | - |
| 5 | `andrew@arenavs.com` | Nov 15 | ArenaVS |
| 6 | `vdubey@plexe.ai` | Nov 15 | Plexe.ai |
| 7 | `shehryar.bajwa@gmail.com` | Nov 14 | - |
| 8 | `zteisenmann@gmail.com` | Nov 13 | - |
| 9 | `winsontang2003@gmail.com` | Nov 13 | - |
| 10 | `nikhilprabhu06@gmail.com` | Nov 13 | - |
| 11 | `sumonigupta@gmail.com` | Nov 13 | - |
| 12 | `applydks@gmail.com` | Nov 13 | - |
| 13 | `rehanul@gasolinetalent.com` | Nov 13 | Gasoline Talent |
| 14 | `isaac@retrofix.ai` | Nov 12 | Retrofix.ai |
| 15 | `shrey@lunchlinepartners.com` | Nov 12 | Lunchline Partners |
| 16 | `rl4917@nyu.edu` | Nov 12 | NYU Student |
| 17 | `vimalrajvasu10@gmail.com` | Nov 12 | - |
| 18 | `hasnain323@gmail.com` | Nov 11 | - |
| 19 | `pss9179@stern.nyu.edu` | Nov 11 | NYU Stern |
| 20 | `narzaryblessing@gmail.com` | Nov 10 | - |
| 21 | `santillanablair@gmail.com` | Nov 10 | - |
| 22 | `bruhpogger69421@gmail.com` | Nov 10 | - |
| 23 | `sujguh@gmail.com` | Nov 10 | - |
| 24 | `nejda25@gmail.com` | Nov 10 | - |
| 25 | `deepaksangleok@gmail.com` | Nov 10 | - |
| 26 | `sam.arenson@synthesia.io` | Nov 10 | **Synthesia** |
| 27 | `pranavlende123@gmail.com` | Nov 9 | - |
| 28 | `amin.nas@gmail.com` | Nov 9 | - |

---

## 🎯 RECOMMENDATIONS

### To Find Signup Sources:

1. **Check PostHog:**
   ```
   Event: "user_signup" or "signup_completed"
   Properties: source, utm_source, utm_medium, referrer
   ```

2. **Check Slack Bot Code:**
   - Look at Dondi/Ari bot implementation
   - See where they pull enrichment data from
   - Check webhook endpoints

3. **Check External Services:**
   - Apollo.io dashboard
   - Clearbit account
   - Any enrichment API keys in `.env`

4. **Check Application Code:**
   - Signup form code
   - Where "source" dropdown is
   - Where enrichment happens

### To Find Interest Form:

- **External form service** (Typeform, Google Forms, Airtable)
- **Landing page builder** (Webflow, Framer, Carrd)
- **Marketing tool** (HubSpot, Mailchimp)
- **Different domain/subdomain**

---

## 📁 FILES CREATED

1. `COMPLETE-SIGNUP-ANALYSIS-NOV9-16.md` - This comprehensive report
2. `signups-nov9-16-2025.csv` - List of 28 signups
3. `signups-detailed-nov9-16-2025.csv` - Detailed metadata
4. `SIGNUP_REPORT_NOV9-16-2025.md` - Initial findings
5. `linkedin_profiles-export.json` - Sample LinkedIn profiles (1000 records)

---

## ✅ SUMMARY

**What we found:**
- ✅ 28 API signups Nov 9-16
- ✅ 808 total users ever
- ✅ 385,521 LinkedIn profiles with rich enrichment data
- ✅ Complete Supabase database structure

**What's missing from database:**
- ❌ Signup source tracking (Product Hunt, LinkedIn, etc.)
- ❌ Interest form submissions
- ❌ User-to-LinkedIn profile mappings
- ❌ Revenue/investor enrichment data
- ❌ Lead qualification scores

**Where to look next:**
- 🔍 PostHog events
- 🔍 External enrichment services
- 🔍 Slack bot source code
- 🔍 Application signup flow code

---

**Database inspected without any changes made** ✅

