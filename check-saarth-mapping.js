require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkMapping() {
  // Get saarth's user ID
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  const saarthUser = allUsers.find(u => u.email === 'saarth@sixtyfour.ai')
  
  if (!saarthUser) {
    console.error('User not found')
    return
  }
  
  console.log('🔍 Checking what saarth@sixtyfour.ai is mapped to...\n')
  console.log('User ID:', saarthUser.id)
  
  // Check current mapping
  const { data, error } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', saarthUser.id)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No mapping found!')
  } else {
    console.log('\n✅ Current mapping:')
    data.forEach(row => {
      console.log(`   ${saarthUser.email} → ${row.org_id}`)
      console.log(`   Created: ${row.created_at}`)
    })
  }
  
  // Show ALL mappings in table
  console.log('\n\n📊 ALL users-org mappings:')
  const { data: allMappings } = await supabase
    .from('users-org')
    .select('*')
    .limit(50)
  
  console.log(`Total mappings: ${allMappings?.length || 0}`)
  
  if (allMappings && allMappings.length > 0) {
    const mappingsWithEmails = await Promise.all(
      allMappings.map(async (m) => {
        const user = allUsers.find(u => u.id === m.id)
        return {
          email: user?.email || 'Unknown',
          org: m.org_id
        }
      })
    )
    
    mappingsWithEmails.forEach(m => {
      console.log(`   ${m.email} → ${m.org}`)
    })
  }
}

checkMapping().catch(console.error)

