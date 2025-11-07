require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkRoopBild() {
  const email = 'roop@bild.ai'
  const orgName = 'bild-ai'
  
  console.log('🔍 Checking roop@bild.ai and bild-ai org...\n')
  console.log('='.repeat(70))
  
  // 1. Check if roop exists
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  const roop = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
  
  console.log('\n1️⃣ USER CHECK (auth.users):')
  if (roop) {
    console.log(`   ✅ roop@bild.ai exists`)
    console.log(`   UUID: ${roop.id}`)
  } else {
    console.log(`   ❌ roop@bild.ai NOT found`)
  }
  
  // 2. Check org assignment
  console.log('\n2️⃣ ORG ASSIGNMENT (users-org):')
  if (roop) {
    const { data: orgMapping } = await supabase
      .from('users-org')
      .select('*')
      .eq('id', roop.id)
      .maybeSingle()
    
    if (orgMapping) {
      console.log(`   ✅ Assigned to: ${orgMapping.org_id}`)
      if (orgMapping.org_id !== orgName) {
        console.log(`   ⚠️  In "${orgMapping.org_id}" not "${orgName}"!`)
      }
    } else {
      console.log(`   ❌ No org assignment`)
    }
  }
  
  // 3. Check bild-ai in api_subscriptions (Credits Management source)
  console.log('\n3️⃣ CREDITS SUBSCRIPTION (api_subscriptions):')
  const { data: subscription } = await supabase
    .from('api_subscriptions')
    .select('*')
    .eq('org_id', orgName)
    .maybeSingle()
  
  if (subscription) {
    console.log(`   ✅ bild-ai has credits record`)
    console.log(`   Balance: ${subscription.balance_prepaid?.toLocaleString() || 0} credits`)
  } else {
    console.log(`   ❌ bild-ai has NO api_subscriptions record`)
    console.log(`   → This is why it doesn't show in Credits Management!`)
  }
  
  // 4. Check organizations table
  console.log('\n4️⃣ ORGANIZATION (organizations table):')
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .ilike('org-id', orgName)
  
  if (org && org.length > 0) {
    console.log(`   ✅ bild-ai exists:`, org.map(o => o['org-id']))
  } else {
    console.log(`   ❌ bild-ai NOT in organizations table`)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 WHY NOT SHOWING IN CREDITS MANAGEMENT:\n')
  console.log('Credits Management only shows orgs that have api_subscriptions records.')
  console.log('')
  
  if (!subscription) {
    console.log('💡 SOLUTION:')
    console.log('Create api_subscriptions record for bild-ai:')
    console.log('')
    console.log('SQL to run in Supabase:')
    console.log('INSERT INTO api_subscriptions (org_id, balance_prepaid)')
    console.log('VALUES (\'bild-ai\', 0);')
    console.log('')
    console.log('Then bild-ai will appear in Credits Management!')
  }
  
  process.exit(0)
}

checkRoopBild().catch(console.error)

