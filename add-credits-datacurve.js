require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function addCreditsDatacurve() {
  const orgId = 'datacurve'
  const creditsToAdd = 13000
  
  console.log(`💰 Adding ${creditsToAdd.toLocaleString()} credits to ${orgId}...\n`)
  
  // Get current balance
  const { data: current } = await supabase
    .from('api_subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()
  
  if (!current) {
    console.log('❌ No subscription record found')
    process.exit(1)
  }
  
  const oldBalance = current.balance_prepaid || 0
  const newBalance = oldBalance + creditsToAdd
  
  console.log(`Old balance: ${oldBalance.toLocaleString()} credits ($${(oldBalance / 10000).toFixed(2)})`)
  console.log(`Adding: ${creditsToAdd.toLocaleString()} credits ($${(creditsToAdd / 10000).toFixed(2)})`)
  
  // Update balance
  const { error } = await supabase
    .from('api_subscriptions')
    .update({ balance_prepaid: newBalance })
    .eq('org_id', orgId)
  
  if (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }
  
  console.log(`New balance: ${newBalance.toLocaleString()} credits ($${(newBalance / 10000).toFixed(2)})`)
  console.log('')
  console.log('✅ Credits added successfully!')
  console.log('')
  console.log('📊 SHARED BY:')
  console.log('   - joey@datacurve.ai')
  console.log('   - tazik@datacurve.ai')
  console.log('')
  console.log('Both users can now use this credit balance.')
  
  process.exit(0)
}

addCreditsDatacurve().catch(console.error)



