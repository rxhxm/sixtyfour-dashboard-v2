require('dotenv').config({ path: '.env.local' })

async function addTanayNow() {
  const email = 'tanaypatil2003@gmail.com'
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  
  console.log(`📧 Adding ${email} to platform access...\n`)
  
  // Feature flag ID (from your dashboard code)
  const flagKey = 'enable-sixtyfour-dashboard'
  
  try {
    // 1. Get current feature flag
    console.log('Step 1: Fetching current feature flag...')
    
    const getUrl = `https://app.posthog.com/api/projects/${projectId}/feature_flags/?key=${flagKey}`
    const getResponse = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status}`)
    }
    
    const flags = await getResponse.json()
    const flag = flags.results?.[0]
    
    if (!flag) {
      throw new Error('Feature flag not found')
    }
    
    console.log(`   ✅ Found flag (ID: ${flag.id})`)
    
    // 2. Get current emails
    const currentEmails = flag.filters?.groups?.[1]?.properties?.[0]?.value || []
    console.log(`   Current users: ${currentEmails.length}`)
    
    if (currentEmails.includes(email)) {
      console.log(`\n✅ ${email} ALREADY has platform access!`)
      process.exit(0)
    }
    
    // 3. Add email
    console.log(`\nStep 2: Adding ${email}...`)
    
    const updatedEmails = [...currentEmails, email]
    const updatedFilters = {
      ...flag.filters,
      groups: [
        flag.filters.groups[0], // Keep Set 1
        {
          ...flag.filters.groups[1],
          properties: [{
            key: 'email',
            value: updatedEmails,
            operator: 'exact',
            type: 'person'
          }]
        }
      ]
    }
    
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
      const errorData = await patchResponse.text()
      throw new Error(`PATCH failed: ${patchResponse.status} - ${errorData}`)
    }
    
    console.log(`✅ Successfully added ${email}!`)
    console.log(`   Total users now: ${updatedEmails.length}`)
    console.log('\n✅ DONE!')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
  
  process.exit(0)
}

addTanayNow()


