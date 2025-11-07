require('dotenv').config({ path: '.env.local' })
const fetch = require('node-fetch')

async function addTanayToPlatformAccess() {
  const email = 'tanaypatil2003@gmail.com'
  
  console.log(`📧 Adding ${email} to platform access email list...\n`)
  
  // This would normally go through the PostHog API
  // But I can't do that from here without PostHog credentials
  
  console.log('⚠️  This requires using the dashboard UI:\n')
  console.log('Steps:')
  console.log('1. Go to: https://dashboard.sixtyfour.ai/platform-access')
  console.log('2. In "Add New User" section:')
  console.log('   - Type: tanaypatil2003@gmail.com')
  console.log('   - Click "Add Access"')
  console.log('3. Done!')
  console.log('')
  console.log('OR tell me if you want me to do something different')
  
  process.exit(0)
}

addTanayToPlatformAccess()


