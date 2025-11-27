require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkTanay() {
  const email = 'tanaypatil2003@gmail.com'
  const targetOrg = 'pixero'
  
  console.log('🔍 Checking Tanay status...\n')
  
  // Get all users
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  const user = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
  
  if (!user) {
    console.log(`❌ ${email} NOT FOUND`)
    console.log('   → User has not signed up yet')
    console.log('   → Cannot give access (need them to sign up first)')
    process.exit(1)
  }
  
  console.log(`✅ User exists: ${user.email}`)
  console.log(`   UUID: ${user.id}`)
  
  // Check current org
  const { data: currentOrg } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  if (currentOrg) {
    console.log(`   Current org: ${currentOrg.org_id}`)
  } else {
    console.log(`   Current org: None`)
  }
  
  // Check if pixero org exists
  const { data: pixeroOrg } = await supabase
    .from('organizations')
    .select('*')
    .ilike('org-id', targetOrg)
  
  if (!pixeroOrg || pixeroOrg.length === 0) {
    console.log(`\n⚠️  "${targetOrg}" org NOT FOUND in organizations table`)
    console.log('   → Need to create org first')
  } else {
    console.log(`\n✅ "${pixeroOrg[0]['org-id']}" org exists`)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n✅ READY TO PROCEED\n')
  console.log('Will now:')
  console.log(`1. ${currentOrg ? `Move ${email} from "${currentOrg.org_id}" to "${targetOrg}"` : `Add ${email} to "${targetOrg}"`}`)
  console.log(`2. Add $20 credits to "${targetOrg}" org`)
  
  process.exit(0)
}

checkTanay().catch(console.error)


