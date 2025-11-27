const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllAuthUsers() {
  console.log('🔍 CHECKING ALL AUTH USERS (WITH PAGINATION)\n');
  
  let allUsers = [];
  let page = 1;
  const perPage = 1000; // Max per request
  
  console.log('Fetching users...\n');
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });
    
    if (error) {
      console.error('Error:', error);
      break;
    }
    
    if (!data.users || data.users.length === 0) {
      break;
    }
    
    console.log(`Page ${page}: ${data.users.length} users`);
    allUsers = [...allUsers, ...data.users];
    
    if (data.users.length < perPage) {
      // Last page
      break;
    }
    
    page++;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`✅ TOTAL AUTH USERS: ${allUsers.length}\n`);
  
  // Check for your team
  console.log('🔍 Searching for your team...\n');
  const teamEmails = ['roham@sixtyfour.ai', 'saarth@sixtyfour.ai', 'chrisprice@sixtyfour.ai'];
  
  teamEmails.forEach(email => {
    const user = allUsers.find(u => u.email === email);
    if (user) {
      console.log(`✅ FOUND: ${email}`);
      console.log(`   UUID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
    } else {
      console.log(`❌ NOT FOUND: ${email}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(70));
  console.log('\n📍 WHERE TO FIND IN SUPABASE:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy');
  console.log('2. Click "Authentication" in left sidebar');
  console.log('3. Click "Users" tab');
  console.log('4. You\'ll see ALL users (paginated)');
  console.log('5. Use search box to find specific emails');
  console.log('\n💡 This is the auth.users table!');
  console.log('   Total users: ' + allUsers.length);
  
  process.exit(0);
}

checkAllAuthUsers();

