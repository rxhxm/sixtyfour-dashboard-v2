require('dotenv').config({ path: '.env.local' })

async function addTanayToPlatform() {
  const email = 'tanaypatil2003@gmail.com'
  
  console.log(`📧 Adding ${email} to platform access...\n`)
  
  // Use the dashboard's API endpoint
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  try {
    // 1. Get current feature flag
    console.log('1. Fetching current platform access list...')
    const getResponse = await fetch(`${baseUrl}/api/posthog/feature-flags`)
    
    if (!getResponse.ok) {
      throw new Error('Failed to fetch feature flags')
    }
    
    const featureFlag = await getResponse.json()
    console.log(`   Current users: ${featureFlag.filters?.groups?.[1]?.properties?.[0]?.value?.length || 0}`)
    
    // 2. Check if already in list
    const currentEmails = featureFlag.filters?.groups?.[1]?.properties?.[0]?.value || []
    
    if (currentEmails.includes(email)) {
      console.log(`\n✅ ${email} ALREADY has platform access!`)
      console.log('   No changes needed.')
      process.exit(0)
    }
    
    // 3. Add email to list
    console.log(`\n2. Adding ${email} to the list...`)
    
    const updatedEmails = [...currentEmails, email]
    const updatedFilters = {
      ...featureFlag.filters,
      groups: [
        featureFlag.filters.groups[0], // Keep Set 1 (regex)
        {
          ...featureFlag.filters.groups[1],
          properties: [
            {
              key: 'email',
              value: updatedEmails,
              operator: 'exact',
              type: 'person'
            }
          ]
        }
      ]
    }
    
    const patchResponse = await fetch(`${baseUrl}/api/posthog/feature-flags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flagId: featureFlag.id,
        filters: updatedFilters
      })
    })
    
    if (!patchResponse.ok) {
      const error = await patchResponse.json()
      throw new Error(error.error || 'Failed to update')
    }
    
    console.log(`✅ Successfully added ${email}!`)
    console.log(`   Total users now: ${updatedEmails.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n⚠️  Could not update via API. Please use dashboard UI:')
    console.log('   https://dashboard.sixtyfour.ai/platform-access')
    process.exit(1)
  }
  
  console.log('\n✅ DONE!')
  process.exit(0)
}

addTanayToPlatform()


