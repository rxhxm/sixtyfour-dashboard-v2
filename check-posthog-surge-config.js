require('dotenv').config({ path: '.env.local' })

async function checkPostHogConfig() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  // Try to get all feature flags first to find the right one
  const listUrl = `https://app.posthog.com/api/projects/${projectId}/feature_flags/`
  
  console.log('🔍 CHECKING POSTHOG CONFIGURATION FOR SURGE ACCESS\n')
  console.log('='.repeat(70))
  
  try {
    // Get all flags to find the dashboard one
    const response = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const flags = await response.json()
    
    // Find the platform_access flag
    const flag = flags.results?.find(f => f.key === 'platform_access')
    
    if (!flag) {
      console.log('Available flags:')
      flags.results?.forEach(f => console.log(`  - ${f.key} (${f.name})`))
      console.log('\n❌ Dashboard feature flag not found')
      process.exit(1)
    }
    
    console.log(`Found flag: ${flag.key} (${flag.name})`)
    
    console.log('\n📋 FEATURE FLAG CONFIGURATION:\n')
    console.log(`Flag: ${flag.key}`)
    console.log(`Active: ${flag.active}`)
    console.log(`\nGroups: ${flag.filters?.groups?.length || 0}`)
    
    // Check each group
    flag.filters?.groups?.forEach((group, idx) => {
      console.log(`\n━━━ GROUP ${idx + 1} ━━━`)
      
      if (group.properties && group.properties.length > 0) {
        group.properties.forEach(prop => {
          console.log(`Property: ${prop.key}`)
          console.log(`Operator: ${prop.operator}`)
          console.log(`Type: ${prop.type}`)
          
          if (prop.operator === 'regex') {
            console.log(`\n🔍 REGEX PATTERN (Auto-grants access):`)
            console.log(`   ${prop.value}`)
            console.log('')
            
            // Check if surge is in the regex
            if (prop.value?.toLowerCase().includes('surge')) {
              console.log('   ✅ SURGE/SURGEHQ DETECTED IN REGEX!')
              console.log('   → Anyone with email matching this regex gets auto-access')
              console.log('')
              
              // Test the regex
              const testEmails = [
                'user@surgehq.ai',
                'user@surge.com', 
                'user@surgehq.com',
                'test@gmail.com'
              ]
              
              console.log('   Testing regex against emails:')
              testEmails.forEach(testEmail => {
                try {
                  const regex = new RegExp(prop.value)
                  const matches = regex.test(testEmail)
                  console.log(`   ${matches ? '✅' : '❌'} ${testEmail}`)
                } catch (e) {
                  console.log(`   ⚠️  ${testEmail} (regex error)`)
                }
              })
            }
          } else if (prop.operator === 'exact') {
            console.log(`\nValue (list of ${Array.isArray(prop.value) ? prop.value.length : 0} emails):`)
            if (Array.isArray(prop.value)) {
              console.log(`   First 5: ${prop.value.slice(0, 5).join(', ')}`)
              console.log(`   ... and ${prop.value.length - 5} more`)
            }
          } else if (prop.operator === 'icontains') {
            console.log(`\n🔍 ICONTAINS PATTERN (Contains text):`)
            console.log(`   Value: "${prop.value}"`)
            console.log(`   → Matches any email containing: "${prop.value}"`)
            console.log('')
            
            if (prop.value && (prop.value.toLowerCase().includes('surge') || prop.value.toLowerCase().includes('surgehq'))) {
              console.log('   ✅ SURGE/SURGEHQ AUTO-ACCESS DETECTED!')
              console.log(`   → Anyone with "${prop.value}" in their email gets access`)
            }
          }
        })
      }
      
      if (group.rollout_percentage !== undefined) {
        console.log(`Rollout: ${group.rollout_percentage}%`)
      }
    })
    
    console.log('\n' + '='.repeat(70))
    console.log('\n💡 WHAT THIS MEANS:\n')
    console.log('Group 1: Regex pattern (auto-grants based on email domain)')
    console.log('Group 2: Explicit email list (manually added users)')
    console.log('')
    console.log('Your team set up Group 1 to auto-grant access to surge emails!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
  
  process.exit(0)
}

checkPostHogConfig()

