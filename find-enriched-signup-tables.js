const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findEnrichedSignupTables() {
  console.log('🔍 SEARCHING FOR ENRICHED SIGNUP DATA TABLES\n');
  console.log('='.repeat(80));
  
  const startDate = new Date('2025-11-09T00:00:00Z');
  const endDate = new Date('2025-11-16T23:59:59Z');
  
  // Possible table names for enriched user data
  const enrichmentTables = [
    'user_profiles',
    'user_enrichment',
    'enriched_users',
    'linkedin_profiles',
    'user_metadata',
    'profiles',
    'user_info',
    'signup_enrichment',
    'leads',
    'qualified_leads',
    'lead_scoring',
    'lead_enrichment',
    'company_data',
    'user_companies',
    'signup_data',
    'signup_sources',
    'user_sources',
    'tracking',
    'analytics',
    'webhooks',
    'slack_notifications',
    'enrichment_data',
    'apollo_data',
    'clearbit_data'
  ];
  
  console.log('\n📊 CHECKING ALL POSSIBLE ENRICHMENT TABLES:\n');
  
  const foundTables = [];
  
  for (const tableName of enrichmentTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(10);
      
      if (!error && data !== null) {
        foundTables.push({ name: tableName, count, data });
        console.log(`✅ FOUND: ${tableName} - ${count || data.length} records`);
      }
    } catch (e) {
      // Table doesn't exist
    }
  }
  
  // Now inspect each found table in detail
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 DETAILED INSPECTION OF FOUND TABLES:\n');
  
  for (const table of foundTables) {
    console.log('\n' + '='.repeat(80));
    console.log(`\n🔍 TABLE: ${table.name.toUpperCase()}`);
    console.log(`Total records: ${table.count || table.data.length}\n`);
    
    if (table.data && table.data.length > 0) {
      // Show columns
      const columns = Object.keys(table.data[0]);
      console.log('Columns:', columns.join(', '));
      console.log('');
      
      // Check for key fields we're looking for
      const hasLinkedIn = columns.some(col => col.toLowerCase().includes('linkedin'));
      const hasSource = columns.some(col => col.toLowerCase().includes('source'));
      const hasRevenue = columns.some(col => col.toLowerCase().includes('revenue'));
      const hasInvestors = columns.some(col => col.toLowerCase().includes('investor'));
      const hasCompany = columns.some(col => col.toLowerCase().includes('company'));
      const hasTitle = columns.some(col => col.toLowerCase().includes('title'));
      const hasAbout = columns.some(col => col.toLowerCase().includes('about') || col.toLowerCase().includes('bio'));
      
      console.log('🎯 KEY FIELDS DETECTED:');
      if (hasLinkedIn) console.log('  ✅ LinkedIn field found');
      if (hasSource) console.log('  ✅ Source field found');
      if (hasRevenue) console.log('  ✅ Revenue field found');
      if (hasInvestors) console.log('  ✅ Investors field found');
      if (hasCompany) console.log('  ✅ Company field found');
      if (hasTitle) console.log('  ✅ Title field found');
      if (hasAbout) console.log('  ✅ About/Bio field found');
      console.log('');
      
      // Show sample records
      console.log('📄 SAMPLE RECORDS:\n');
      table.data.slice(0, 5).forEach((record, i) => {
        console.log(`--- Record ${i + 1} ---`);
        Object.entries(record).forEach(([key, value]) => {
          // Truncate long values
          let displayValue = value;
          if (typeof value === 'string' && value.length > 100) {
            displayValue = value.substring(0, 100) + '...';
          }
          console.log(`  ${key}: ${displayValue}`);
        });
        console.log('');
      });
      
      // Check for Nov 9-16 signups
      if (table.data[0].created_at || table.data[0].joined_at || table.data[0].signup_date) {
        const dateField = table.data[0].created_at ? 'created_at' : 
                         table.data[0].joined_at ? 'joined_at' : 'signup_date';
        
        const recordsInPeriod = table.data.filter(record => {
          if (!record[dateField]) return false;
          const recordDate = new Date(record[dateField]);
          return recordDate >= startDate && recordDate <= endDate;
        });
        
        console.log(`\n📅 Records from Nov 9-16, 2025: ${recordsInPeriod.length}\n`);
      }
      
      // Look for Courtne Marland specifically
      const courtneyRecord = table.data.find(record => {
        const recordStr = JSON.stringify(record).toLowerCase();
        return recordStr.includes('courtne') || recordStr.includes('courtney');
      });
      
      if (courtneyRecord) {
        console.log('🎯 FOUND COURTNE MARLAND RECORD:\n');
        Object.entries(courtneyRecord).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        console.log('');
      }
      
      // Look for Kacem
      const kacemRecord = table.data.find(record => {
        const recordStr = JSON.stringify(record).toLowerCase();
        return recordStr.includes('kacem');
      });
      
      if (kacemRecord) {
        console.log('🎯 FOUND KACEM MATHLOUTHI RECORD:\n');
        Object.entries(kacemRecord).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        console.log('');
      }
    }
  }
  
  // Get full data from promising tables
  console.log('\n\n' + '='.repeat(80));
  console.log('📥 FETCHING FULL DATA FROM ALL FOUND TABLES:\n');
  
  for (const table of foundTables) {
    try {
      const { data: fullData, error } = await supabase
        .from(table.name)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (!error && fullData) {
        console.log(`\n✅ ${table.name}: Retrieved ${fullData.length} records`);
        
        // Filter for Nov 9-16
        const nov9to16 = fullData.filter(record => {
          const dateField = record.created_at || record.joined_at || record.signup_date;
          if (!dateField) return false;
          const recordDate = new Date(dateField);
          return recordDate >= startDate && recordDate <= endDate;
        });
        
        console.log(`   Nov 9-16: ${nov9to16.length} records`);
        
        // Check for LinkedIn sources
        const linkedInSources = fullData.filter(record => {
          const recordStr = JSON.stringify(record).toLowerCase();
          return recordStr.includes('linkedin');
        });
        
        console.log(`   LinkedIn mentions: ${linkedInSources.length} records`);
        
        // Export to file
        const fs = require('fs');
        if (fullData.length > 0) {
          fs.writeFileSync(
            `${table.name}-export.json`,
            JSON.stringify(fullData, null, 2)
          );
          console.log(`   ✅ Exported to: ${table.name}-export.json`);
        }
      }
    } catch (e) {
      console.log(`   ❌ Error fetching full data: ${e.message}`);
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY:\n');
  console.log(`✅ Found ${foundTables.length} enrichment/tracking tables`);
  foundTables.forEach(t => {
    console.log(`   - ${t.name}: ${t.count || t.data.length} records`);
  });
  
  if (foundTables.length === 0) {
    console.log('\n❌ No enrichment tables found!');
    console.log('💡 The enrichment data might be:');
    console.log('   - Stored in a different Supabase project');
    console.log('   - Only sent to Slack without database storage');
    console.log('   - Using a third-party service (Apollo, Clearbit, etc.)');
    console.log('   - Stored in external database (PostgreSQL, MongoDB, etc.)');
  }
  
  process.exit(0);
}

findEnrichedSignupTables();

