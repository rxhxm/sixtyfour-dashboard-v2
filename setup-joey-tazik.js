require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function setupJoeyTazik() {
  console.log('🚀 Setting up Joey and Tazik for platform access...\n')
  console.log('='.repeat(70))
  
  const users = [
    { email: 'joey@datacurve.ai', org: 'datacurve' },
    { email: 'tazik@datacurve.ai', org: 'datacurve' }
  ]
  
  // Get all auth users
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  console.log('\n1️⃣ ASSIGNING USERS TO DATACURVE ORG:\n')
  
  for (const { email, org } of users) {
    const user = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      console.log(`❌ ${email} - User not found`)
      continue
    }
    
    // Check current org
    const { data: existing } = await supabase
      .from('users-org')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    if (existing && existing.org_id === org) {
      console.log(`✅ ${email} - Already in ${org} org`)
      continue
    }
    
    // Remove old org if exists
    if (existing) {
      await supabase
        .from('users-org')
        .delete()
        .eq('id', user.id)
      console.log(`   Removed from ${existing.org_id}`)
    }
    
    // Assign to datacurve
    const { error } = await supabase
      .from('users-org')
      .insert({
        id: user.id,
        org_id: org
      })
    
    if (error) {
      console.log(`❌ ${email} - Failed to assign: ${error.message}`)
    } else {
      console.log(`✅ ${email} - Assigned to ${org}`)
    }
  }
  
  console.log('\n2️⃣ ADDING TO PLATFORM ACCESS (PostHog):\n')
  
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  
  // Get current flag
  const getUrl = `https://app.posthog.com/api/projects/${projectId}/feature_flags/?key=platform_access`
  const getResponse = await fetch(getUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })
  
  const flags = await getResponse.json()
  const flag = flags.results?.[0]
  
  if (!flag) {
    console.log('❌ Feature flag not found')
    process.exit(1)
  }
  
  // Get current email list (Group 2)
  const currentEmails = flag.filters?.groups?.[1]?.properties?.[0]?.value || []
  
  // Add both emails if not already there
  const emailsToAdd = users.map(u => u.email).filter(e => !currentEmails.includes(e))
  
  if (emailsToAdd.length === 0) {
    console.log('✅ Both emails already have platform access!')
  } else {
    const updatedEmails = [...currentEmails, ...emailsToAdd]
    
    // Use robust approach to preserve all groups
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
      console.log('❌ Failed to update PostHog')
      process.exit(1)
    }
    
    emailsToAdd.forEach(email => {
      console.log(`✅ ${email} - Added to platform access`)
    })
    console.log(`   Total users now: ${updatedEmails.length}`)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n✅ SETUP COMPLETE!\n')
  console.log('Joey and Tazik now have:')
  console.log('  ✅ Org assignment: datacurve')
  console.log('  ✅ Platform email access')
  console.log('')
  console.log('They can now use the Sixtyfour platform!')
  console.log('Tell them to log out and back in if already logged in.')
  
  process.exit(0)
}

setupJoeyTazik().catch(console.error)



