require('dotenv').config({ path: '.env.local' })

async function addAlbertToPlatform() {
  const email = 'albert@datacurve.ai'
  
  console.log(`📧 Adding ${email} to platform access...\n`)
  
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
  
  // Get current emails (Group 2)
  const currentEmails = flag.filters?.groups?.[1]?.properties?.[0]?.value || []
  
  if (currentEmails.includes(email)) {
    console.log(`✅ ${email} already has platform access!`)
    console.log('\n⚠️  If workflows is greyed out, tell Albert to:')
    console.log('   1. Log out completely')
    console.log('   2. Clear browser cache')
    console.log('   3. Log back in')
    process.exit(0)
  }
  
  // Add to list (preserve all groups)
  const updatedEmails = [...currentEmails, email]
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
  
  console.log(`✅ Added ${email} to platform access!`)
  console.log(`   Total users now: ${updatedEmails.length}`)
  console.log('')
  console.log('Albert now has:')
  console.log('  ✅ Org assignment: datacurve')
  console.log('  ✅ Platform email access')
  console.log('')
  console.log('Tell him to log out and back in to refresh his session.')
  
  process.exit(0)
}

addAlbertToPlatform().catch(console.error)



