require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkErikAuth() {
  console.log('🔍 Checking Erik\'s auth account...\n')
  
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
  
  // Search for erik
  const erik = allUsers.find(u => u.email?.toLowerCase() === 'erik@sixtyfour.ai')
  
  if (erik) {
    console.log('✅ Erik HAS a Supabase auth account:')
    console.log(`   Email: ${erik.email}`)
    console.log(`   Provider: ${erik.app_metadata?.provider || 'Unknown'}`)
    console.log(`   Created: ${new Date(erik.created_at).toLocaleString()}`)
    console.log(`   Email confirmed: ${erik.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Last sign in: ${erik.last_sign_in_at ? new Date(erik.last_sign_in_at).toLocaleString() : 'Never'}`)
    console.log('')
    console.log('✅ He can log into dashboard with:')
    console.log(`   Email: erik@sixtyfour.ai`)
    console.log(`   Password: (whatever he set up)`)
  } else {
    console.log('❌ Erik does NOT have a Supabase auth account yet')
    console.log('')
    console.log('💡 SOLUTION: Erik needs to create an account:')
    console.log('   1. Go to: https://dashboard.sixtyfour.ai/auth/signin')
    console.log('   2. Use "Sign in with Google" (if enabled)')
    console.log('   OR')
    console.log('   3. Create account with erik@sixtyfour.ai + password')
  }
  
  process.exit(0)
}

checkErikAuth().catch(console.error)


