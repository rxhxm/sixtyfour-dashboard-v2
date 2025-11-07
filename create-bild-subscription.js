require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function createBildSubscription() {
  const orgId = 'bild-ai'
  
  console.log(`📝 Creating api_subscriptions record for ${orgId}...\n`)
  
  // Create the record with 0 balance
  const { data, error } = await supabase
    .from('api_subscriptions')
    .insert({
      org_id: orgId,
      balance_prepaid: 0
    })
    .select()
  
  if (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }
  
  console.log(`✅ Created api_subscriptions record for bild-ai`)
  console.log(`   Starting balance: $0.00`)
  console.log('')
  console.log('Now bild-ai will appear in Credits Management dashboard!')
  console.log('You can add credits to puneet and roop through the UI.')
  
  process.exit(0)
}

createBildSubscription().catch(console.error)

