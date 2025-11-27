require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function addCredits() {
  const orgId = 'pixero'
  const dollarsToAdd = 20
  const creditsToAdd = dollarsToAdd * 10000 // $20 = 200,000 credits
  
  console.log(`💰 Adding $${dollarsToAdd} (${creditsToAdd.toLocaleString()} credits) to ${orgId}...\n`)
  
  // Check current balance
  const { data: current } = await supabase
    .from('api_subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()
  
  if (!current) {
    console.log(`⚠️  No api_subscriptions record for ${orgId}`)
    console.log('   Creating new record...')
    
    const { error } = await supabase
      .from('api_subscriptions')
      .insert({
        org_id: orgId,
        balance_prepaid: creditsToAdd
      })
    
    if (error) {
      console.error('❌ Failed:', error)
      process.exit(1)
    }
    
    console.log(`✅ Created with ${creditsToAdd.toLocaleString()} credits ($${dollarsToAdd})`)
  } else {
    const oldBalance = current.balance_prepaid || 0
    const newBalance = oldBalance + creditsToAdd
    
    console.log(`Current balance: ${oldBalance.toLocaleString()} credits ($${(oldBalance / 10000).toFixed(2)})`)
    
    const { error } = await supabase
      .from('api_subscriptions')
      .update({ balance_prepaid: newBalance })
      .eq('org_id', orgId)
    
    if (error) {
      console.error('❌ Failed:', error)
      process.exit(1)
    }
    
    console.log(`New balance: ${newBalance.toLocaleString()} credits ($${(newBalance / 10000).toFixed(2)})`)
    console.log(`✅ Added $${dollarsToAdd}!`)
  }
  
  console.log('\n✅ DONE!')
  process.exit(0)
}

addCredits().catch(console.error)

