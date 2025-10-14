require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkSignupMetrics() {
  console.log('📊 CHECKING SIGNUP & USER METRICS\n')
  console.log('='.repeat(70))
  
  // 1. Check auth.users (all signups)
  console.log('\n1️⃣ Total Users Who Signed Up (auth.users):\n')
  
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  console.log(`✅ Total signups: ${allUsers.length} users`)
  console.log(`   Recent signups (last 7 days): ${allUsers.filter(u => {
    const created = new Date(u.created_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return created > weekAgo
  }).length}`)
  
  // 2. Check users-org (users with org assignments)
  console.log('\n2️⃣ Users With Org Access (users-org):\n')
  
  const { data: userOrgs } = await supabase
    .from('users-org')
    .select('*')
  
  const uniqueUsers = new Set(userOrgs?.map(uo => uo.id) || [])
  console.log(`✅ Users with org mappings: ${uniqueUsers.size}`)
  console.log(`   Total org assignments: ${userOrgs?.length || 0}`)
  
  // 3. Check api_keys (users with API keys)
  console.log('\n3️⃣ Users With API Keys:\n')
  
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
  
  console.log(`✅ Total API keys: ${apiKeys?.length || 0}`)
  
  const uniqueOrgsWithKeys = new Set(apiKeys?.map(k => k.org_id) || [])
  console.log(`   Orgs with API keys: ${uniqueOrgsWithKeys.size}`)
  
  // 4. Check organizations table
  console.log('\n4️⃣ Total Organizations:\n')
  
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
  
  console.log(`✅ Total orgs: ${orgs?.length || 0}`)
  
  // 5. Check for interest form or waitlist table
  console.log('\n5️⃣ Interest Form / Waitlist:\n')
  
  // Try common table names
  const possibleTables = ['interest_form', 'waitlist', 'signups', 'leads', 'prospects']
  
  for (const tableName of possibleTables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact', head: true })
    
    if (!error) {
      console.log(`✅ Found table "${tableName}":`, data)
    }
  }
  
  // 6. Summary
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 SUMMARY:\n')
  console.log(`Total Signups (auth.users):          ${allUsers.length}`)
  console.log(`Users With Org Access (users-org):   ${uniqueUsers.size}`)
  console.log(`API Keys Issued:                     ${apiKeys?.length || 0}`)
  console.log(`Total Organizations:                 ${orgs?.length || 0}`)
  
  console.log('\n💡 INTERPRETATION:')
  console.log(`   ${allUsers.length} people signed up for accounts`)
  console.log(`   ${uniqueUsers.size} have been assigned to organizations`)
  console.log(`   ${orgs?.length || 0} organizations exist in the system`)
  console.log(`   ${apiKeys?.length || 0} API keys have been created`)
  
  const activationRate = ((uniqueUsers.size / allUsers.length) * 100).toFixed(1)
  console.log(`\n   Activation rate: ${activationRate}% (users → org access)`)
  
  process.exit(0)
}

checkSignupMetrics().catch(console.error)

