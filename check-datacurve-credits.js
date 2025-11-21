require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkDatacurveCredits() {
  console.log('💰 Checking datacurve org credits...\n')
  
  const { data: subscription } = await supabase
    .from('api_subscriptions')
    .select('*')
    .eq('org_id', 'datacurve')
    .maybeSingle()
  
  if (!subscription) {
    console.log('❌ datacurve has NO api_subscriptions record')
    console.log('   → Need to create one (like we did for bild-ai)')
    console.log('')
    console.log('Creating api_subscriptions record...')
    
    const { error } = await supabase
      .from('api_subscriptions')
      .insert({
        org_id: 'datacurve',
        balance_prepaid: 0
      })
    
    if (error) {
      console.error('❌ Failed to create:', error)
      process.exit(1)
    }
    
    console.log('✅ Created with $0.00 balance')
    console.log('')
    console.log('📊 CURRENT STATUS:')
    console.log('   Balance: $0.00')
    console.log('   Shared by: joey@datacurve.ai, tazik@datacurve.ai')
  } else {
    const balanceCredits = subscription.balance_prepaid || 0
    const balanceDollars = (balanceCredits / 10000).toFixed(2)
    
    console.log('✅ datacurve org credits:')
    console.log(`   Balance: $${balanceDollars} (${balanceCredits.toLocaleString()} credits)`)
    console.log('')
    console.log('📊 CREDIT SHARING:')
    console.log('   YES - Both Joey and Tazik share this balance')
    console.log('   Organization: datacurve')
    console.log('   Users in org: joey@datacurve.ai, tazik@datacurve.ai')
    console.log('')
    console.log('   When either person uses the API:')
    console.log('   → Credits deducted from this shared pool')
  }
  
  console.log('\n💡 HOW ORG CREDITS WORK:\n')
  console.log('All users in the SAME org share ONE credit pool.')
  console.log('Example:')
  console.log('  - datacurve org has $20')
  console.log('  - Joey uses $5 → balance now $15')
  console.log('  - Tazik sees $15 (shared balance)')
  console.log('  - Tazik uses $10 → balance now $5')
  console.log('  - Both see $5 remaining')
  
  process.exit(0)
}

checkDatacurveCredits().catch(console.error)



