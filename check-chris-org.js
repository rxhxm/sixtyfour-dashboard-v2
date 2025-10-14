require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkChrisOrg() {
  console.log('🔍 Checking Chris\'s current org...\n')
  
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
  
  const chrisUser = allUsers.find(u => u.email === 'chrisprice@sixtyfour.ai')
  
  if (!chrisUser) {
    console.error('❌ Chris not found in auth.users')
    return
  }
  
  console.log('✅ Found Chris:')
  console.log('   Email:', chrisUser.email)
  console.log('   UUID:', chrisUser.id)
  
  // Check current mapping
  const { data: mapping } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', chrisUser.id)
    .maybeSingle()
  
  if (!mapping) {
    console.log('\n❌ Chris has NO org mapping!')
    console.log('   → He needs to be ADDED to Sixtyfour org')
    console.log('\n💡 SOLUTION:')
    console.log('   Use dashboard: Add chrisprice@sixtyfour.ai to Sixtyfour')
  } else {
    console.log('\n📊 Current mapping:')
    console.log('   chrisprice@sixtyfour.ai → ' + mapping.org_id)
    
    if (mapping.org_id === 'Sixtyfour' || mapping.org_id === 'sixtyfour') {
      console.log('\n✅ Chris is ALREADY in Sixtyfour org!')
      console.log('   No change needed.')
    } else {
      console.log('\n💡 SOLUTION:')
      console.log('   Use dashboard: Move chrisprice@sixtyfour.ai from', mapping.org_id, 'to Sixtyfour')
      console.log('\n   Steps:')
      console.log('   1. Go to Platform Access tab')
      console.log('   2. Type: chrisprice@sixtyfour.ai')
      console.log('   3. Current org will show:', mapping.org_id)
      console.log('   4. Type new org: Sixtyfour')
      console.log('   5. Confirm the move')
      console.log('   6. Done!')
    }
  }
  
  // Check if "Sixtyfour" org exists
  console.log('\n🔍 Checking if "Sixtyfour" org exists...')
  const { data: sixtyfourOrg } = await supabase
    .from('organizations')
    .select('"org-id"')
    .ilike('org-id', 'Sixtyfour')
  
  if (sixtyfourOrg && sixtyfourOrg.length > 0) {
    console.log('✅ "Sixtyfour" org exists:',sixtyfourOrg.map(o => o['org-id']))
  } else {
    console.log('⚠️  No "Sixtyfour" org found!')
    console.log('   Check exact capitalization in organizations table')
  }
}

checkChrisOrg().catch(console.error)


