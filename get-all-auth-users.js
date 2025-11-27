const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllAuthUsers() {
  console.log('📧 Fetching ALL auth users (with pagination)...\n');
  
  let allUsers = [];
  let page = 1;
  const perPage = 1000; // Max per page
  
  while (true) {
    console.log(`Fetching page ${page}...`);
    
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
    
    allUsers = allUsers.concat(data.users);
    console.log(`  Got ${data.users.length} users (total so far: ${allUsers.length})`);
    
    if (data.users.length < perPage) {
      // Last page
      break;
    }
    
    page++;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`✅ TOTAL AUTH USERS: ${allUsers.length}\n`);
  
  // Check for your team
  console.log('🔍 Checking for your team emails:\n');
  const teamEmails = ['roham@sixtyfour.ai', 'saarth@sixtyfour.ai', 'chrisprice@sixtyfour.ai'];
  
  teamEmails.forEach(email => {
    const user = allUsers.find(u => u.email === email);
    if (user) {
      console.log(`✅ ${email}`);
      console.log(`   UUID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
    } else {
      console.log(`❌ ${email} - NOT FOUND`);
    }
    console.log('');
  });
  
  console.log('='.repeat(70));
  console.log('\n💡 WHERE TO VIEW IN SUPABASE:');
  console.log('1. Go to: https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy');
  console.log('2. Click "Authentication" in left sidebar (🔐 icon)');
  console.log('3. Click "Users" tab');
  console.log('4. You\'ll see all users with emails');
  console.log('5. Use search bar to find specific emails');
  console.log('6. This is the auth.users table!');
  
  // Export to CSV
  const fs = require('fs');
  const csv = ['id,email,created_at'].concat(
    allUsers.map(u => `${u.id},${u.email},${u.created_at}`)
  ).join('\n');
  
  fs.writeFileSync('ALL-auth-users.csv', csv);
  console.log('\n✅ Exported to: ALL-auth-users.csv');
  console.log(`   (${allUsers.length} users)`);
  
  process.exit(0);
}

getAllAuthUsers();

