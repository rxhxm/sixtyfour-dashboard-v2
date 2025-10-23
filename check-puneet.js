require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkPuneet() {
  console.log('🔍 Searching for Puneet...\n')
  
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
  
  // Search for puneet (partial match)
  const puneets = allUsers.filter(u => 
    u.email?.toLowerCase().includes('puneet')
  )
  
  console.log(`Found ${puneets.length} user(s) with "puneet" in email:\n`)
  
  puneets.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`)
    console.log(`   UUID: ${user.id}`)
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
  })
  
  if (puneets.length === 0) {
    console.log('❌ No Puneet found')
    console.log('   → They have NOT signed up yet')
    return
  }
  
  // Check org mappings for all puneets found
  console.log('\n' + '='.repeat(70))
  console.log('\nChecking org assignments:\n')
  
  for (const user of puneets) {
    const { data: orgMapping } = await supabase
      .from('users-org')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    console.log(`${user.email}:`)
    if (orgMapping) {
      console.log(`   ✅ Org: ${orgMapping.org_id}`)
    } else {
      console.log(`   ❌ No org assignment`)
    }
  }
  
  // Check bild-ai org
  console.log('\n' + '='.repeat(70))
  console.log('\nChecking bild-ai org:\n')
  
  const { data: bildOrg } = await supabase
    .from('organizations')
    .select('*')
    .ilike('org-id', 'bild-ai')
  
  if (bildOrg && bildOrg.length > 0) {
    console.log(`✅ "bild-ai" org exists:`, bildOrg.map(o => o['org-id']))
  } else {
    console.log(`❌ "bild-ai" org NOT found`)
  }
  
  // Check who's currently in bild-ai
  const { data: bildUsers } = await supabase
    .from('users-org')
    .select('*')
    .ilike('org_id', 'bild-ai')
  
  if (bildUsers && bildUsers.length > 0) {
    console.log(`\nCurrent bild-ai users: ${bildUsers.length}`)
    for (const mapping of bildUsers) {
      const user = allUsers.find(u => u.id === mapping.id)
      console.log(`   - ${user?.email || 'Unknown'}`)
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n💡 TO GIVE PUNEET ACCESS:\n')
  
  if (puneets.length > 0) {
    const puneet = puneets[0]
    console.log('Use Organization Access Management:')
    console.log(`1. User Email: ${puneet.email}`)
    console.log(`2. New Organization: bild-ai`)
    console.log(`3. Click "Add Access"`)
    console.log(`4. Confirm`)
    console.log('')
    console.log('Then for credits:')
    console.log('1. Go to Credits Management tab')
    console.log('2. Search for "bild-ai"')
    console.log('3. Add credits to the bild-ai organization')
  }
  
  process.exit(0)
}

checkPuneet().catch(console.error)



