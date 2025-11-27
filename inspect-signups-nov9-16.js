const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSignupsNov9to16() {
  console.log('🔍 INSPECTING SIGNUPS: November 9-16, 2025\n');
  console.log('='.repeat(80));
  
  // Date range
  const startDate = new Date('2025-11-09T00:00:00Z');
  const endDate = new Date('2025-11-16T23:59:59Z');
  
  console.log(`\n📅 Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
  
  // ===== 1. CHECK ALL TABLES IN DATABASE =====
  console.log('\n1️⃣ DISCOVERING ALL TABLES IN DATABASE:\n');
  
  // Try to query each known table pattern
  const knownTables = [
    'organizations',
    'api_keys',
    'api_usage',
    'users-org',
    'api_subscriptions',
    'waitlist',
    'interest_form',
    'interest_forms',
    'signups',
    'leads',
    'contacts',
    'submissions'
  ];
  
  console.log('Checking known table patterns:\n');
  
  for (const tableName of knownTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`  ✅ ${tableName} - ${count} records`);
      }
    } catch (e) {
      // Table doesn't exist, skip
    }
  }
  
  // ===== 2. AUTH USERS (API SIGNUPS) =====
  console.log('\n\n2️⃣ AUTH USERS (API SIGNUPS) - Nov 9-16, 2025:\n');
  
  let allUsers = [];
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });
    
    if (error || !data.users || data.users.length === 0) {
      break;
    }
    
    allUsers = allUsers.concat(data.users);
    
    if (data.users.length < perPage) {
      break;
    }
    
    page++;
  }
  
  console.log(`Total auth users in database: ${allUsers.length}`);
  
  // Filter by date range Nov 9-16
  const signupsInPeriod = allUsers.filter(user => {
    const createdAt = new Date(user.created_at);
    return createdAt >= startDate && createdAt <= endDate;
  });
  
  console.log(`\n📊 SIGNUPS FROM NOV 9-16, 2025: ${signupsInPeriod.length} users\n`);
  
  if (signupsInPeriod.length > 0) {
    console.log('Sample signups:');
    signupsInPeriod.slice(0, 10).forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} - ${new Date(user.created_at).toLocaleString()}`);
    });
    
    if (signupsInPeriod.length > 10) {
      console.log(`  ... and ${signupsInPeriod.length - 10} more`);
    }
  }
  
  // ===== 3. CHECK FOR INTEREST FORMS / WAITLIST =====
  console.log('\n\n3️⃣ CHECKING FOR INTEREST FORMS / WAITLIST:\n');
  
  // Try different table names that might contain interest forms
  const interestFormTables = [
    'interest_forms',
    'interest_form',
    'waitlist',
    'signups',
    'leads',
    'contacts',
    'submissions',
    'form_submissions'
  ];
  
  for (const tableName of interestFormTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (!error && data && data.length > 0) {
        console.log(`\n✅ FOUND TABLE: ${tableName}`);
        console.log(`Total records: ${data.length}`);
        console.log(`Columns: ${Object.keys(data[0]).join(', ')}\n`);
        
        // Filter by date if has created_at
        let recordsInPeriod = data;
        if (data[0].created_at) {
          recordsInPeriod = data.filter(record => {
            const createdAt = new Date(record.created_at);
            return createdAt >= startDate && createdAt <= endDate;
          });
          console.log(`Records from Nov 9-16, 2025: ${recordsInPeriod.length}\n`);
        }
        
        // Check for LinkedIn source
        const linkedInRecords = data.filter(record => {
          const recordStr = JSON.stringify(record).toLowerCase();
          return recordStr.includes('linkedin') || recordStr.includes('linked in');
        });
        
        console.log(`Records mentioning LinkedIn (all time): ${linkedInRecords.length}\n`);
        
        // Show sample data
        console.log('Sample records:');
        data.slice(0, 5).forEach((record, i) => {
          console.log(`\n  Record ${i + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });
        });
        
        console.log('\n' + '='.repeat(80));
      }
    } catch (e) {
      // Table doesn't exist or error accessing it
    }
  }
  
  // ===== 4. CHECK USERS-ORG TABLE FOR METADATA =====
  console.log('\n\n4️⃣ CHECKING USERS-ORG TABLE FOR ADDITIONAL DATA:\n');
  
  try {
    const { data: usersOrg, error } = await supabase
      .from('users-org')
      .select('*')
      .limit(1000);
    
    if (!error && usersOrg) {
      console.log(`Total users-org records: ${usersOrg.length}`);
      console.log(`Columns: ${Object.keys(usersOrg[0] || {}).join(', ')}\n`);
      
      // Check if any users from our signup period are here
      const userIdsFromPeriod = signupsInPeriod.map(u => u.id);
      const matchingRecords = usersOrg.filter(uo => userIdsFromPeriod.includes(uo.id));
      
      console.log(`Users-org records for Nov 9-16 signups: ${matchingRecords.length}\n`);
      
      if (matchingRecords.length > 0) {
        console.log('Sample:');
        matchingRecords.slice(0, 5).forEach((record, i) => {
          console.log(`  ${i + 1}.`, record);
        });
      }
    }
  } catch (e) {
    console.log('Could not access users-org table');
  }
  
  // ===== 5. SUMMARY =====
  console.log('\n\n📊 SUMMARY:\n');
  console.log('='.repeat(80));
  console.log(`\n✅ API Signups (auth.users) Nov 9-16: ${signupsInPeriod.length}`);
  console.log(`✅ Total auth users in system: ${allUsers.length}`);
  console.log('\n💡 For interest forms/waitlist:');
  console.log('   - Check results above for any discovered tables');
  console.log('   - Look for "source", "referral", or similar fields for LinkedIn tracking');
  
  // Export signups to CSV
  const fs = require('fs');
  if (signupsInPeriod.length > 0) {
    const csv = ['email,created_at,user_id'].concat(
      signupsInPeriod.map(u => `${u.email},${u.created_at},${u.id}`)
    ).join('\n');
    
    fs.writeFileSync('signups-nov9-16-2025.csv', csv);
    console.log('\n✅ Exported to: signups-nov9-16-2025.csv');
  }
  
  process.exit(0);
}

inspectSignupsNov9to16();

