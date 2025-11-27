const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportToCSV() {
  console.log('📤 Exporting email data to CSV files...\n');
  
  // ============================================
  // 1. Export users-org table
  // ============================================
  console.log('1️⃣ Fetching users-org table...');
  const { data: usersOrg, error: usersOrgError } = await supabase
    .from('users-org')
    .select('*');
  
  if (usersOrgError) {
    console.error('Error fetching users-org:', usersOrgError);
  } else {
    console.log(`   Found ${usersOrg.length} records`);
    
    // Convert to CSV
    const headers = Object.keys(usersOrg[0]).join(',');
    const rows = usersOrg.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    // Save to file
    fs.writeFileSync('users-org.csv', csv);
    console.log('   ✅ Saved to: users-org.csv');
  }
  
  console.log('');
  
  // ============================================
  // 2. Export auth.users table
  // ============================================
  console.log('2️⃣ Fetching auth.users table...');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
  } else {
    console.log(`   Found ${users.length} records`);
    
    // Convert to CSV (simplified - just id and email)
    const csvData = users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at || '',
      last_sign_in_at: user.last_sign_in_at || ''
    }));
    
    const headers = 'id,email,created_at,email_confirmed_at,last_sign_in_at';
    const rows = csvData.map(row => 
      `${row.id},${row.email},${row.created_at},${row.email_confirmed_at},${row.last_sign_in_at}`
    );
    const csv = [headers, ...rows].join('\n');
    
    // Save to file
    fs.writeFileSync('auth-users.csv', csv);
    console.log('   ✅ Saved to: auth-users.csv');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ EXPORT COMPLETE!\n');
  console.log('Files created:');
  console.log('  1. users-org.csv      (514 rows - user_id → org_id mapping)');
  console.log('  2. auth-users.csv     (50 rows - user_id → email mapping)');
  console.log('\nTo find matches:');
  console.log('  - Open both files in Excel/Numbers');
  console.log('  - VLOOKUP on "id" column');
  console.log('  - Match user_id from users-org with id from auth-users');
  console.log('  - Get email for each org!');
  
  process.exit(0);
}

exportToCSV();

const fs = require('fs');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportToCSV() {
  console.log('📤 Exporting email data to CSV files...\n');
  
  // ============================================
  // 1. Export users-org table
  // ============================================
  console.log('1️⃣ Fetching users-org table...');
  const { data: usersOrg, error: usersOrgError } = await supabase
    .from('users-org')
    .select('*');
  
  if (usersOrgError) {
    console.error('Error fetching users-org:', usersOrgError);
  } else {
    console.log(`   Found ${usersOrg.length} records`);
    
    // Convert to CSV
    const headers = Object.keys(usersOrg[0]).join(',');
    const rows = usersOrg.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    // Save to file
    fs.writeFileSync('users-org.csv', csv);
    console.log('   ✅ Saved to: users-org.csv');
  }
  
  console.log('');
  
  // ============================================
  // 2. Export auth.users table
  // ============================================
  console.log('2️⃣ Fetching auth.users table...');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
  } else {
    console.log(`   Found ${users.length} records`);
    
    // Convert to CSV (simplified - just id and email)
    const csvData = users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at || '',
      last_sign_in_at: user.last_sign_in_at || ''
    }));
    
    const headers = 'id,email,created_at,email_confirmed_at,last_sign_in_at';
    const rows = csvData.map(row => 
      `${row.id},${row.email},${row.created_at},${row.email_confirmed_at},${row.last_sign_in_at}`
    );
    const csv = [headers, ...rows].join('\n');
    
    // Save to file
    fs.writeFileSync('auth-users.csv', csv);
    console.log('   ✅ Saved to: auth-users.csv');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ EXPORT COMPLETE!\n');
  console.log('Files created:');
  console.log('  1. users-org.csv      (514 rows - user_id → org_id mapping)');
  console.log('  2. auth-users.csv     (50 rows - user_id → email mapping)');
  console.log('\nTo find matches:');
  console.log('  - Open both files in Excel/Numbers');
  console.log('  - VLOOKUP on "id" column');
  console.log('  - Match user_id from users-org with id from auth-users');
  console.log('  - Get email for each org!');
  
  process.exit(0);
}

exportToCSV();

