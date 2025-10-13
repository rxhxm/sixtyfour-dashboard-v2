const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAuthUsers() {
  console.log('📧 INSPECTING auth.users TABLE\n');
  console.log('='.repeat(70));
  
  // Get all auth users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(`\nTotal users in auth.users: ${users.length}\n`);
  
  // Show sample users
  console.log('Sample users (first 10):\n');
  users.slice(0, 10).forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`);
    console.log(`   UUID: ${user.id}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });
  
  console.log('='.repeat(70));
  console.log('\n💡 HOW TO INSPECT IN SUPABASE DASHBOARD:');
  console.log('1. Go to: https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy');
  console.log('2. Click "Authentication" in sidebar');
  console.log('3. Click "Users" tab');
  console.log('4. Browse all users with emails!');
  console.log('\n📊 This is the auth.users table');
  console.log('   (It\'s in the "auth" schema, not "public")');
  
  process.exit(0);
}

inspectAuthUsers();


const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAuthUsers() {
  console.log('📧 INSPECTING auth.users TABLE\n');
  console.log('='.repeat(70));
  
  // Get all auth users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(`\nTotal users in auth.users: ${users.length}\n`);
  
  // Show sample users
  console.log('Sample users (first 10):\n');
  users.slice(0, 10).forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`);
    console.log(`   UUID: ${user.id}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });
  
  console.log('='.repeat(70));
  console.log('\n💡 HOW TO INSPECT IN SUPABASE DASHBOARD:');
  console.log('1. Go to: https://supabase.com/dashboard/project/iszvhmzqbaplwemstyzy');
  console.log('2. Click "Authentication" in sidebar');
  console.log('3. Click "Users" tab');
  console.log('4. Browse all users with emails!');
  console.log('\n📊 This is the auth.users table');
  console.log('   (It\'s in the "auth" schema, not "public")');
  
  process.exit(0);
}

inspectAuthUsers();

