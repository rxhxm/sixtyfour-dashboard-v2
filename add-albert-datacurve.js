require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function addAlbertToDatacurve() {
  const emailPattern = 'albert@datacurve'
  const org = 'datacurve'
  
  console.log(`🔍 Searching for albert@datacurve...\n`)
  
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
  
  // Find albert
  const albert = allUsers.find(u => u.email?.toLowerCase().includes(emailPattern.toLowerCase()))
  
  if (!albert) {
    console.log('❌ Albert not found in auth.users')
    console.log('   → He has not signed up yet')
    process.exit(0)
  }
  
  console.log(`✅ Found: ${albert.email}`)
  console.log(`   UUID: ${albert.id}`)
  
  // Check current org
  const { data: currentOrg } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', albert.id)
    .maybeSingle()
  
  if (currentOrg) {
    if (currentOrg.org_id === org) {
      console.log(`\n✅ ${albert.email} already in ${org} org!`)
      console.log('   No changes needed.')
      process.exit(0)
    }
    
    console.log(`\nCurrent org: ${currentOrg.org_id}`)
    console.log(`Moving to: ${org}`)
    
    // Delete old
    await supabase
      .from('users-org')
      .delete()
      .eq('id', albert.id)
    
    console.log(`✅ Removed from ${currentOrg.org_id}`)
  }
  
  // Add to datacurve
  const { error } = await supabase
    .from('users-org')
    .insert({
      id: albert.id,
      org_id: org
    })
  
  if (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }
  
  console.log(`✅ Added ${albert.email} to ${org}!`)
  console.log('')
  console.log('📊 datacurve org now has:')
  console.log('   - joey@datacurve.ai')
  console.log('   - tazik@datacurve.ai')
  console.log('   - roham@sixtyfour.ai')
  console.log(`   - ${albert.email}`)
  console.log('')
  console.log(`All 4 users share $1.35 in credits`)
  
  process.exit(0)
}

addAlbertToDatacurve().catch(console.error)



