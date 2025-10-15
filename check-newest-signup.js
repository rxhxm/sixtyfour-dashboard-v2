require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkNewestSignup() {
  console.log('🔍 Checking newest signup in Supabase...\n')
  
  // Get all users sorted by created_at
  let allUsers = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data.users || data.users.length === 0) break
    allUsers = [...allUsers, ...data.users]
    if (data.users.length < 1000) break
    page++
  }
  
  console.log(`📊 Total users in Supabase: ${allUsers.length}\n`)
  
  // Sort by created_at (newest first)
  allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  console.log('🆕 NEWEST 10 SIGNUPS:\n')
  allUsers.slice(0, 10).forEach((user, idx) => {
    const createdDate = new Date(user.created_at)
    const now = new Date()
    const hoursAgo = Math.floor((now - createdDate) / (1000 * 60 * 60))
    const daysAgo = Math.floor(hoursAgo / 24)
    
    const timeAgo = daysAgo > 0 ? `${daysAgo} days ago` : `${hoursAgo} hours ago`
    
    console.log(`${idx + 1}. ${user.email}`)
    console.log(`   Signed up: ${createdDate.toLocaleString()}`)
    console.log(`   (${timeAgo})`)
    console.log('')
  })
  
  console.log('='.repeat(70))
  console.log('\n💡 ABOUT THE 360 EMAIL LIST:\n')
  console.log('That list you showed is likely from an EMAIL MARKETING platform like:')
  console.log('  - Loops.so')
  console.log('  - Mailchimp')
  console.log('  - SendGrid')
  console.log('  - Resend')
  console.log('')
  console.log('360 subscribers = people who signed up for your:')
  console.log('  - Newsletter')
  console.log('  - Product updates')
  console.log('  - Interest form / waitlist')
  console.log('')
  console.log(`Comparison:`)
  console.log(`  Email platform: 360 subscribers`)
  console.log(`  Supabase auth: ${allUsers.length} signups`)
  console.log('')
  console.log('The 360 are likely a SUBSET of your ${allUsers.length} total users.')
  console.log('Not everyone who signs up for the product subscribes to emails.')
  
  process.exit(0)
}

checkNewestSignup().catch(console.error)

