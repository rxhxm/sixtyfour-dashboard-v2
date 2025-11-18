const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  console.log('🔍 LISTING ALL TABLES IN SUPABASE DATABASE\n');
  console.log('='.repeat(80));
  
  // Query PostgreSQL system tables to get all user tables
  const { data: tables, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT 
          table_schema,
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_schema = t.table_schema 
           AND table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });
  
  if (error) {
    console.log('❌ Direct SQL query failed, trying manual enumeration...\n');
    
    // Manually try to access tables
    const knownTables = [
      'organizations', 'api_keys', 'api_usage', 'users-org', 'api_subscriptions',
      'linkedin_profiles', 'leads', 'waitlist', 'signups', 'user_signups',
      'signup_data', 'signup_tracking', 'signup_sources', 'user_sources',
      'user_metadata', 'profiles', 'user_profiles', 'enriched_users',
      'enrichment', 'onboarding', 'user_onboarding', 'registrations',
      'user_events', 'events', 'analytics', 'tracking'
    ];
    
    console.log('📋 CHECKING ALL KNOWN TABLE PATTERNS:\n');
    
    const foundTables = [];
    
    for (const tableName of knownTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          foundTables.push({ name: tableName, count });
          console.log(`✅ ${tableName.padEnd(30)} - ${count || 0} records`);
        }
      } catch (e) {}
    }
    
    console.log(`\n\nTotal tables found: ${foundTables.length}`);
    
    // Now inspect each table for relevant fields
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 DETAILED TABLE INSPECTION:\n');
    
    for (const table of foundTables) {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        const columns = Object.keys(data[0]);
        const hasSource = columns.some(col => col.toLowerCase().includes('source'));
        const hasLinkedIn = columns.some(col => col.toLowerCase().includes('linkedin'));
        
        if (hasSource || hasLinkedIn || table.count > 0) {
          console.log(`\n📋 ${table.name}:`);
          console.log(`   Records: ${table.count}`);
          console.log(`   Columns: ${columns.join(', ')}`);
          
          if (hasSource) console.log(`   🎯 HAS SOURCE FIELD!`);
          if (hasLinkedIn) console.log(`   💼 HAS LINKEDIN FIELD!`);
        }
      }
    }
  } else {
    console.log('✅ All tables in public schema:\n');
    tables.forEach(table => {
      console.log(`  ${table.table_name.padEnd(40)} (${table.column_count} columns)`);
    });
  }
  
  // Final search for signup source specifically
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 FINAL SEARCH SUMMARY:\n');
  console.log('Looking for tables with:');
  console.log('  1. Signup source tracking (Product Hunt, LinkedIn, Other)');
  console.log('  2. User enrichment data (revenue, investors, company size)');
  console.log('  3. Link between auth.users and linkedin_profiles');
  console.log('\n💡 If not found in Supabase:');
  console.log('  - Data might be in PostHog events');
  console.log('  - Data might be sent only to Slack without DB storage');
  console.log('  - Data might be in different Supabase project');
  console.log('  - Enrichment might happen via external API at webhook time');
  
  process.exit(0);
}

listAllTables();

