require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function findAndAddJayu() {
  console.log('🔍 Searching for jayu@getdelve or similar...\n')
  
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
  
  // Search for jayu with delve domain
  const matches = allUsers.filter(u => 
    u.email?.toLowerCase().includes('jayu') || 
    (u.email?.toLowerCase().includes('delve') && u.email?.toLowerCase().includes('jay'))
  )
  
  console.log(`Found ${matches.length} potential matches:\n`)
  matches.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`)
    console.log(`   UUID: ${user.id}`)
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
    console.log('')
  })
  
  if (matches.length === 0) {
    console.log('❌ No matches found')
    console.log('\nTried searching for:')
    console.log('  - Emails containing "jayu"')
    console.log('  - Emails with "jay" and "delve"')
    process.exit(0)
  }
  
  // Now add to platform access via PostHog
  const targetEmail = matches[0].email
  
  console.log(`\n📧 Adding ${targetEmail} to platform access...\n`)
  
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const flagKey = 'platform_access'
  
  // Get current flag
  const getUrl = `https://app.posthog.com/api/projects/${projectId}/feature_flags/?key=${flagKey}`
  const getResponse = await fetch(getUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })
  
  const flags = await getResponse.json()
  const flag = flags.results?.[0]
  
  if (!flag) {
    console.error('❌ Feature flag not found')
    process.exit(1)
  }
  
  // Get current emails (Group 2)
  const currentEmails = flag.filters?.groups?.[1]?.properties?.[0]?.value || []
  
  if (currentEmails.includes(targetEmail)) {
    console.log(`✅ ${targetEmail} ALREADY has platform access!`)
    process.exit(0)
  }
  
  // Add to list using robust approach (preserve all groups)
  const updatedEmails = [...currentEmails, targetEmail]
  const updatedGroups = flag.filters.groups.map((group, index) => {
    if (index === 1) {
      return {
        ...group,
        properties: [{
          key: 'email',
          value: updatedEmails,
          operator: 'exact',
          type: 'person'
        }],
        rollout_percentage: 100
      }
    }
    return group
  })
  
  const updatedFilters = {
    ...flag.filters,
    groups: updatedGroups
  }
  
  // Update PostHog
  const patchUrl = `https://app.posthog.com/api/projects/${projectId}/feature_flags/${flag.id}/`
  const patchResponse = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filters: updatedFilters })
  })
  
  if (!patchResponse.ok) {
    console.error('❌ Failed to update')
    process.exit(1)
  }
  
  console.log(`✅ Added ${targetEmail} to platform access!`)
  console.log(`   Total users now: ${updatedEmails.length}`)
  
  process.exit(0)
}

findAndAddJayu().catch(console.error)

