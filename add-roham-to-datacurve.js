require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function addRohamToDatacurve() {
  const email = 'roham@sixtyfour.ai'
  const org = 'datacurve'
  
  console.log(`📝 Adding ${email} to ${org} org...\n`)
  
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
    console.log('❌ Roham not found')
    process.exit(1)
  }
  
  console.log(`User ID: ${user.id}`)
  
  // Check current org
  const { data: currentOrg } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  if (currentOrg) {
    console.log(`Current org: ${currentOrg.org_id}`)
    console.log(`Moving from "${currentOrg.org_id}" to "${org}"...`)
    
    // Delete old mapping
    await supabase
      .from('users-org')
      .delete()
      .eq('id', user.id)
    
    console.log(`✅ Removed from ${currentOrg.org_id}`)
  }
  
  // Add to datacurve
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
  
  console.log(`✅ Added to ${org}!`)
  console.log('')
  console.log('📊 datacurve org now has:')
  console.log('   - joey@datacurve.ai')
  console.log('   - tazik@datacurve.ai')
  console.log('   - roham@sixtyfour.ai (YOU)')
  console.log('')
  console.log('You can now:')
  console.log('  ✅ See their workflows')
  console.log('  ✅ Monitor their API usage')
  console.log('  ✅ Check their activities')
  console.log('  ✅ Share the same $1.35 credit pool')
  
  process.exit(0)
}

addRohamToDatacurve().catch(console.error)



