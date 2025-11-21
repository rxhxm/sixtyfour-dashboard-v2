require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function findRohamMeh() {
  console.log('🔍 Searching for roham.meh...\n')
  
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
  
  // Search for roham.meh
  const matches = allUsers.filter(u => 
    u.email?.toLowerCase().includes('roham.meh')
  )
  
  console.log(`Found ${matches.length} match(es):\n`)
  
  if (matches.length === 0) {
    console.log('❌ No user found with "roham.meh" in email')
    process.exit(0)
  }
  
  matches.forEach(user => {
    console.log(`✅ ${user.email}`)
    console.log(`   UUID: ${user.id}`)
  })
  
  // Use first match
  const user = matches[0]
  const org = 'ronin'
  
  console.log(`\n📝 Adding ${user.email} to ${org}...\n`)
  
  // Check current org
  const { data: currentOrg } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  if (currentOrg) {
    if (currentOrg.org_id === org) {
      console.log(`✅ Already in ${org} org!`)
      process.exit(0)
    }
    
    console.log(`Moving from "${currentOrg.org_id}" to "${org}"...`)
    
    await supabase
      .from('users-org')
      .delete()
      .eq('id', user.id)
  }
  
  // Add to ronin
  const { error } = await supabase
    .from('users-org')
    .insert({
      id: user.id,
      org_id: org
    })
  
  if (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }
  
  console.log(`✅ Added ${user.email} to ${org}!`)
  
  process.exit(0)
}

findRohamMeh().catch(console.error)


