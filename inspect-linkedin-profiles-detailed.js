const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLinkedInProfiles() {
  console.log('🔍 INSPECTING LINKEDIN_PROFILES TABLE IN DETAIL\n');
  console.log('='.repeat(80));
  
  const startDate = new Date('2025-11-09T00:00:00Z');
  const endDate = new Date('2025-11-16T23:59:59Z');
  
  // Get auth users from Nov 9-16
  console.log('\n1️⃣ Getting auth users from Nov 9-16...\n');
  
  let allUsers = [];
  let page = 1;
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });
    
    if (error || !data.users || data.users.length === 0) break;
    allUsers = allUsers.concat(data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  
  const nov9to16Users = allUsers.filter(user => {
    const createdAt = new Date(user.created_at);
    return createdAt >= startDate && createdAt <= endDate;
  });
  
  console.log(`Found ${nov9to16Users.length} users from Nov 9-16`);
  console.log('\nUsers:');
  nov9to16Users.forEach(u => console.log(`  - ${u.email}`));
  
  // Now search for these users in linkedin_profiles or other tables
  console.log('\n\n2️⃣ SEARCHING FOR USER SIGNUP DATA WITH SOURCES...\n');
  
  const possibleTables = [
    'user_signups',
    'signup_tracking',
    'user_tracking',
    'signup_events',
    'user_events',
    'onboarding',
    'user_onboarding'
  ];
  
  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(10);
      
      if (!error && data && data.length > 0) {
        console.log(`\n✅ FOUND TABLE: ${tableName}`);
        console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);
        console.log('Sample record:');
        console.log(JSON.stringify(data[0], null, 2));
      }
    } catch (e) {}
  }
  
  // Get LinkedIn profiles and inspect metadata
  console.log('\n\n3️⃣ INSPECTING LINKEDIN_PROFILES METADATA:\n');
  
  const { data: linkedinProfiles, error: linkedinError } = await supabase
    .from('linkedin_profiles')
    .select('*')
    .limit(100);
  
  if (linkedinError) {
    console.log('❌ Error:', linkedinError);
  } else {
    console.log(`✅ Retrieved ${linkedinProfiles.length} LinkedIn profiles\n`);
    
    // Show detailed metadata structure
    console.log('📋 SAMPLE PROFILE WITH FULL METADATA:\n');
    const sampleProfile = linkedinProfiles[0];
    console.log('Profile structure:');
    console.log(JSON.stringify(sampleProfile, null, 2));
    
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 ANALYZING METADATA FIELDS:\n');
    
    // Analyze what's in metadata
    const metadataKeys = new Set();
    linkedinProfiles.forEach(profile => {
      if (profile.metadata && typeof profile.metadata === 'object') {
        Object.keys(profile.metadata).forEach(key => metadataKeys.add(key));
      }
    });
    
    console.log('Available fields in metadata:');
    Array.from(metadataKeys).sort().forEach(key => {
      console.log(`  - ${key}`);
    });
    
    // Look for Courtne Marland
    console.log('\n\n4️⃣ SEARCHING FOR COURTNE MARLAND:\n');
    
    const courtneProfile = linkedinProfiles.find(profile => {
      const metaStr = JSON.stringify(profile).toLowerCase();
      return metaStr.includes('courtne') || metaStr.includes('lyra');
    });
    
    if (courtneProfile) {
      console.log('✅ FOUND COURTNE:');
      console.log(JSON.stringify(courtneProfile, null, 2));
    } else {
      console.log('❌ Not found in first 100 profiles, searching all...');
      
      const { data: allProfiles, error } = await supabase
        .from('linkedin_profiles')
        .select('*')
        .or('linkedin_url.ilike.%courtne%,metadata->>name.ilike.%courtne%')
        .limit(10);
      
      if (!error && allProfiles && allProfiles.length > 0) {
        console.log('✅ FOUND COURTNE:');
        console.log(JSON.stringify(allProfiles[0], null, 2));
      }
    }
  }
  
  // Check for user-to-linkedin mapping table
  console.log('\n\n5️⃣ LOOKING FOR USER-TO-LINKEDIN MAPPING:\n');
  
  const mappingTables = [
    'user_linkedin',
    'user_profiles',
    'profiles',
    'user_enrichment',
    'enriched_users'
  ];
  
  for (const tableName of mappingTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(10);
      
      if (!error && data) {
        console.log(`\n✅ FOUND: ${tableName} (${count} records)`);
        console.log(`Columns: ${Object.keys(data[0] || {}).join(', ')}`);
        
        if (data.length > 0) {
          console.log('\nSample record:');
          console.log(JSON.stringify(data[0], null, 2));
          
          // Look for Nov 9-16 users
          const userIds = nov9to16Users.map(u => u.id);
          
          // Try different user ID field names
          const userIdFields = ['user_id', 'id', 'auth_user_id', 'supabase_user_id'];
          
          for (const field of userIdFields) {
            if (data[0][field]) {
              console.log(`\nSearching for Nov 9-16 users using field: ${field}`);
              
              const { data: nov9to16Data, error: searchError } = await supabase
                .from(tableName)
                .select('*')
                .in(field, userIds);
              
              if (!searchError && nov9to16Data) {
                console.log(`✅ Found ${nov9to16Data.length} records for Nov 9-16 users!`);
                
                if (nov9to16Data.length > 0) {
                  console.log('\nRecords:');
                  nov9to16Data.forEach((record, i) => {
                    console.log(`\n--- Record ${i + 1} ---`);
                    console.log(JSON.stringify(record, null, 2));
                  });
                }
              }
              break;
            }
          }
        }
      }
    } catch (e) {}
  }
  
  // Export summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY:\n');
  console.log('✅ linkedin_profiles table: 385,521 records');
  console.log('   - Contains LinkedIn URLs and metadata');
  console.log('   - Need to find mapping to auth users');
  console.log('\n💡 Next steps:');
  console.log('   1. Find table that maps users to LinkedIn profiles');
  console.log('   2. Find table with signup sources (Product Hunt, LinkedIn, etc.)');
  console.log('   3. Check if enrichment is done via webhook/external service');
  
  process.exit(0);
}

inspectLinkedInProfiles();

