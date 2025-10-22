require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkUserAccess() {
  const email = 'paurakh@tesseralabs.ai'
  
  console.log(`🔍 Checking access for: ${email}\n`)
  console.log('='.repeat(70))
  
  // 1. Check if user exists in auth.users
  console.log('\n1️⃣ Checking if user exists in auth.users...')
  
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  const user = allUsers.find(u => u.email === email)
  
  if (!user) {
    console.log(`❌ ${email} does NOT exist in auth.users`)
    console.log('   → They have never signed up for Sixtyfour')
    return
  }
  
  console.log(`✅ User exists in auth.users`)
  console.log(`   UUID: ${user.id}`)
  console.log(`   Created: ${user.created_at}`)
  
  // 2. Check if they have org assignment
  console.log('\n2️⃣ Checking org assignment in users-org...')
  
  const { data: orgMapping } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  if (orgMapping) {
    console.log(`✅ Has org access: ${orgMapping.org_id}`)
    console.log(`   Assigned: ${orgMapping.created_at}`)
  } else {
    console.log(`❌ No org assignment`)
    console.log(`   → User exists but not assigned to any org`)
  }
  
  // 3. Summary
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 SUMMARY FOR:', email)
  console.log('')
  console.log(`Auth Account: ${user ? '✅ Yes' : '❌ No'}`)
  console.log(`Org Access: ${orgMapping ? `✅ Yes (${orgMapping.org_id})` : '❌ No'}`)
  console.log(`Platform Access: ${orgMapping ? '✅ Can use API/workflows' : '❌ Cannot access'}`)
  
  process.exit(0)
}

checkUserAccess().catch(console.error)


