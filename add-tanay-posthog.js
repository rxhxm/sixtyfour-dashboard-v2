require('dotenv').config({ path: '.env.local' })
const https = require('https')

async function addTanayToPostHog() {
  const email = 'tanaypatil2003@gmail.com'
  
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  
  if (!apiKey || !projectId) {
    console.log('❌ PostHog credentials not found in .env.local')
    console.log('\n💡 QUICK SOLUTION:')
    console.log('Use dashboard UI (takes 30 seconds):')
    console.log('1. Go to: https://dashboard.sixtyfour.ai/platform-access')
    console.log('2. Type: tanaypatil2003@gmail.com')
    console.log('3. Click "Add Access"')
    console.log('4. Done!')
    process.exit(0)
  }
  
  console.log(`📧 Adding ${email} to platform access via PostHog...\n`)
  console.log('This would update PostHog feature flag directly.')
  console.log('\n⚠️  However, for safety and audit trail, please use dashboard UI:')
  console.log('https://dashboard.sixtyfour.ai/platform-access')
  console.log('\nIt takes 30 seconds and ensures proper logging!')
  
  process.exit(0)
}

addTanayToPostHog()


