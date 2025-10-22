require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function verifyPaurakhComplete() {
  const email = 'paurakh@tesseralabs.ai'
  
  console.log('🔍 COMPLETE ACCESS VERIFICATION\n')
  console.log(`Email: ${email}`)
  console.log('='.repeat(70))
  
  // 1. Find user in auth
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
  
  console.log('\n1️⃣ AUTH ACCOUNT (auth.users):')
  if (user) {
    console.log(`   ✅ EXISTS`)
    console.log(`   UUID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
    console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`)
  } else {
    console.log(`   ❌ DOES NOT EXIST`)
    console.log(`   → User has NOT signed up`)
    return
  }
  
  // 2. Check org mapping
  console.log('\n2️⃣ ORG ASSIGNMENT (users-org):')
  const { data: orgMapping } = await supabase
    .from('users-org')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  if (orgMapping) {
    console.log(`   ✅ ASSIGNED`)
    console.log(`   Org ID: ${orgMapping.org_id}`)
    console.log(`   Assigned on: ${new Date(orgMapping.created_at).toLocaleString()}`)
  } else {
    console.log(`   ❌ NOT ASSIGNED`)
    console.log(`   → User exists but no org access`)
  }
  
  // 3. Check if org exists
  if (orgMapping) {
    console.log('\n3️⃣ ORG EXISTS (organizations table):')
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('org-id', orgMapping.org_id)
      .maybeSingle()
    
    if (org) {
      console.log(`   ✅ ORG EXISTS`)
      console.log(`   Org: ${org['org-id']}`)
    } else {
      console.log(`   ⚠️  ORG "${orgMapping.org_id}" NOT IN organizations TABLE`)
      console.log(`   → Might cause issues accessing platform`)
    }
  }
  
  // 4. Final verdict
  console.log('\n' + '='.repeat(70))
  console.log('\n✅ FINAL VERDICT:\n')
  
  if (!user) {
    console.log('❌ User has NOT signed up for Sixtyfour')
  } else if (!orgMapping) {
    console.log('⚠️  User signed up but NOT assigned to any organization')
    console.log('   → Use "Organization Access Management" to assign them')
  } else {
    console.log('✅ User is FULLY SET UP and should have access')
    console.log(`   Email: ${user.email}`)
    console.log(`   Org: ${orgMapping.org_id}`)
    console.log('')
    console.log('💡 If they cannot access:')
    console.log('   1. Ask them to try logging out and back in')
    console.log('   2. Check if they are using the correct email')
    console.log('   3. Verify they completed email confirmation')
  }
  
  process.exit(0)
}

verifyPaurakhComplete().catch(console.error)

