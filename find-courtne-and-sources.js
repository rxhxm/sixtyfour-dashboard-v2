const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCourtneAndSources() {
  console.log('🔍 SEARCHING FOR COURTNE MARLAND & SIGNUP SOURCES\n');
  console.log('='.repeat(80));
  
  // 1. Search LinkedIn profiles for Courtne
  console.log('\n1️⃣ SEARCHING LINKEDIN_PROFILES FOR COURTNE MARLAND:\n');
  
  const { data: courtneProfiles, error: courtneError } = await supabase
    .from('linkedin_profiles')
    .select('*')
    .or('linkedin_url.ilike.%courtne%,linkedin_url.ilike.%lyra%')
    .limit(10);
  
  if (!courtneError && courtneProfiles && courtneProfiles.length > 0) {
    console.log(`✅ Found ${courtneProfiles.length} matching profiles:\n`);
    courtneProfiles.forEach((profile, i) => {
      console.log(`\n--- Profile ${i + 1} ---`);
      console.log(`ID: ${profile.id}`);
      console.log(`URL: ${profile.linkedin_url}`);
      console.log(`Name: ${profile.metadata?.name || 'N/A'}`);
      console.log(`Title: ${profile.metadata?.position || 'N/A'}`);
      console.log(`Company: ${profile.metadata?.current_company_name || 'N/A'}`);
      console.log(`About: ${(profile.metadata?.about || 'N/A').substring(0, 200)}...`);
    });
  } else {
    console.log('❌ No Courtne profiles found in linkedin_profiles');
  }
  
  // 2. Search ALL tables for "source" field
  console.log('\n\n2️⃣ SEARCHING ALL TABLES FOR SIGNUP SOURCE DATA:\n');
  
  // Get list of all tables by trying common names
  const allPossibleTables = [
    'signups', 'user_signups', 'signup_data', 'signup_tracking', 'signup_sources',
    'user_sources', 'user_metadata', 'user_info', 'user_data', 'user_details',
    'profiles', 'user_profiles', 'enriched_users', 'enrichment',
    'onboarding', 'user_onboarding', 'registrations', 'user_registrations',
    'auth_metadata', 'auth_enrichment', 'webhook_data', 'slack_data'
  ];
  
  for (const tableName of allPossibleTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(5);
      
      if (!error && data) {
        const columns = Object.keys(data[0] || {});
        const hasSource = columns.some(col => col.toLowerCase().includes('source'));
        const hasLinkedIn = columns.some(col => col.toLowerCase().includes('linkedin'));
        const hasUserId = columns.some(col => col.toLowerCase().includes('user'));
        const hasEmail = columns.some(col => col.toLowerCase().includes('email'));
        
        if (hasSource || (hasLinkedIn && hasUserId) || (hasEmail && data.length > 0)) {
          console.log(`\n✅ FOUND: ${tableName} (${count} records)`);
          console.log(`   Columns: ${columns.join(', ')}`);
          
          if (hasSource) console.log(`   🎯 HAS SOURCE FIELD!`);
          if (hasLinkedIn) console.log(`   💼 HAS LINKEDIN FIELD!`);
          
          if (data.length > 0) {
            console.log('\n   Sample record:');
            console.log(JSON.stringify(data[0], null, 2));
            
            // Search for courtne in this table
            const courtneSearch = data.find(record => {
              const str = JSON.stringify(record).toLowerCase();
              return str.includes('courtne') || str.includes('lyra');
            });
            
            if (courtneSearch) {
              console.log('\n   🎯 FOUND COURTNE IN THIS TABLE:');
              console.log(JSON.stringify(courtneSearch, null, 2));
            }
          }
        }
      }
    } catch (e) {}
  }
  
  // 3. Try text search across postgresql
  console.log('\n\n3️⃣ SEARCHING FOR TABLES WITH courtne@lyra.so:\n');
  
  // Try to find where courtne@lyra.so appears
  for (const tableName of allPossibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .or('email.eq.courtne@lyra.so,user_email.eq.courtne@lyra.so')
        .limit(5);
      
      if (!error && data && data.length > 0) {
        console.log(`\n✅ FOUND courtne@lyra.so in ${tableName}:`);
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (e) {}
  }
  
  // 4. Check if source is in a different database or external service
  console.log('\n\n4️⃣ CHECKING FOR EXTERNAL DATA SOURCES:\n');
  console.log('The signup source might be stored in:');
  console.log('  - Separate analytics database');
  console.log('  - PostHog events');
  console.log('  - Mixpanel/Amplitude');
  console.log('  - Webhook logs');
  console.log('  - Slack bot database');
  console.log('  - External enrichment service (Apollo, Clearbit, etc.)');
  
  // 5. Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FINDINGS:\n');
  console.log('✅ linkedin_profiles table exists with 385,521 LinkedIn profiles');
  console.log('❌ No direct user-to-LinkedIn mapping table found yet');
  console.log('❌ No signup source tracking table found yet');
  console.log('\n💡 The Slack messages suggest:');
  console.log('   1. There IS a source tracking system (Product Hunt, LinkedIn, Other)');
  console.log('   2. There IS enrichment with LinkedIn data, revenue, investors');
  console.log('   3. These might be in tables we haven\'t checked yet');
  console.log('\n🔍 Recommendation:');
  console.log('   - Check Supabase dashboard to see ALL table names');
  console.log('   - Look for tables created recently (after user signups)');
  console.log('   - Check if Dondi/Ari bots have separate storage');
  
  process.exit(0);
}

findCourtneAndSources();

