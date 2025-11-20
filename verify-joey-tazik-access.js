require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function verifyAccess() {
  console.log('🔍 CHECKING JOEY & TAZIK PLATFORM ACCESS\n')
  console.log('='.repeat(70))
  
  const emails = ['joey@datacurve.ai', 'tazik@datacurve.ai']
  
  // Get all users
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  for (const email of emails) {
    console.log(`\n━━━ ${email.toUpperCase()} ━━━\n`)
    
    const user = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      console.log('❌ Account: No')
      continue
    }
    
    console.log('✅ Account: Yes')
    console.log(`   UUID: ${user.id}`)
    
    // Check org assignment
    const { data: orgMapping } = await supabase
      .from('users-org')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    if (orgMapping) {
      console.log(`✅ Org Assignment: ${orgMapping.org_id}`)
    } else {
      console.log('❌ Org Assignment: None')
    }
    
    // Check platform email access via PostHog
    const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
    const projectId = process.env.POSTHOG_PROJECT_ID
    
    const getUrl = `https://app.posthog.com/api/projects/${projectId}/feature_flags/?key=platform_access`
    const response = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const flags = await response.json()
    const flag = flags.results?.[0]
    
    let hasEmailAccess = false
    if (flag && flag.filters?.groups) {
      // Check all groups
      for (const group of flag.filters.groups) {
        if (!group.properties) continue
        
        for (const prop of group.properties) {
          if (prop.key === 'email') {
            if (prop.operator === 'exact' && Array.isArray(prop.value)) {
              if (prop.value.includes(email)) {
                hasEmailAccess = true
                break
              }
            }
          }
        }
      }
    }
    
    if (hasEmailAccess) {
      console.log('✅ Platform Email Access: Yes (in PostHog whitelist)')
    } else {
      console.log('❌ Platform Email Access: No (not in PostHog whitelist)')
    }
    
    // Final verdict
    console.log('\n📊 CAN USE PLATFORM:')
    if (orgMapping && hasEmailAccess) {
      console.log('   ✅ YES - Fully configured')
    } else if (!orgMapping && hasEmailAccess) {
      console.log('   ⚠️  PARTIAL - Has email access but NO org (cannot use features)')
    } else if (orgMapping && !hasEmailAccess) {
      console.log('   ⚠️  PARTIAL - Has org but NO email access (blocked at login)')
    } else {
      console.log('   ❌ NO - Missing both org and email access')
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n💡 SUMMARY:\n')
  console.log('For platform access, users need BOTH:')
  console.log('  1. Email in PostHog whitelist (or matching auto-access rule)')
  console.log('  2. Org assignment in users-org table')
  console.log('')
  console.log('Missing either = cannot access platform')
  
  process.exit(0)
}

verifyAccess().catch(console.error)

