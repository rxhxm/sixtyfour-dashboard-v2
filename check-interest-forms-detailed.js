const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInterestFormsDetailed() {
  console.log('🔍 DETAILED CHECK: INTEREST FORMS & WAITLIST\n');
  console.log('='.repeat(80));
  
  const startDate = new Date('2025-11-09T00:00:00Z');
  const endDate = new Date('2025-11-16T23:59:59Z');
  
  // ===== 1. WAITLIST TABLE =====
  console.log('\n1️⃣ WAITLIST TABLE:\n');
  
  try {
    const { data: waitlistData, error: waitlistError } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (waitlistError) {
      console.log('❌ Error:', waitlistError.message);
    } else if (!waitlistData || waitlistData.length === 0) {
      console.log('📭 Waitlist table exists but is EMPTY (0 records)');
    } else {
      console.log(`✅ Found ${waitlistData.length} waitlist records\n`);
      console.log('Columns:', Object.keys(waitlistData[0]).join(', '));
      
      // Filter by date range
      let recordsInPeriod = waitlistData;
      if (waitlistData[0].created_at) {
        recordsInPeriod = waitlistData.filter(record => {
          const createdAt = new Date(record.created_at);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }
      
      console.log(`\n📊 Records from Nov 9-16, 2025: ${recordsInPeriod.length}\n`);
      
      // Check for LinkedIn mentions
      const linkedInRecords = waitlistData.filter(record => {
        const recordStr = JSON.stringify(record).toLowerCase();
        return recordStr.includes('linkedin') || 
               recordStr.includes('linked in') ||
               recordStr.includes('linked-in');
      });
      
      console.log(`💼 LinkedIn mentions (all time): ${linkedInRecords.length}\n`);
      
      // Show all records
      console.log('All waitlist records:\n');
      waitlistData.forEach((record, i) => {
        console.log(`\n--- Record ${i + 1} ---`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
      
      // LinkedIn records in detail
      if (linkedInRecords.length > 0) {
        console.log('\n\n💼 LINKEDIN RECORDS IN DETAIL:\n');
        linkedInRecords.forEach((record, i) => {
          console.log(`\n--- LinkedIn Record ${i + 1} ---`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
      }
    }
  } catch (e) {
    console.log('❌ Could not access waitlist table:', e.message);
  }
  
  // ===== 2. LEADS TABLE =====
  console.log('\n\n2️⃣ LEADS TABLE:\n');
  
  try {
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (leadsError) {
      console.log('❌ Error:', leadsError.message);
    } else if (!leadsData || leadsData.length === 0) {
      console.log('📭 Leads table exists but is EMPTY (0 records)');
    } else {
      console.log(`✅ Found ${leadsData.length} leads records\n`);
      console.log('Columns:', Object.keys(leadsData[0]).join(', '));
      
      // Filter by date range
      let recordsInPeriod = leadsData;
      if (leadsData[0].created_at) {
        recordsInPeriod = leadsData.filter(record => {
          const createdAt = new Date(record.created_at);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }
      
      console.log(`\n📊 Records from Nov 9-16, 2025: ${recordsInPeriod.length}\n`);
      
      // Check for LinkedIn mentions
      const linkedInRecords = leadsData.filter(record => {
        const recordStr = JSON.stringify(record).toLowerCase();
        return recordStr.includes('linkedin') || 
               recordStr.includes('linked in') ||
               recordStr.includes('linked-in');
      });
      
      console.log(`💼 LinkedIn mentions (all time): ${linkedInRecords.length}\n`);
      
      // Show all records
      console.log('All leads records:\n');
      leadsData.forEach((record, i) => {
        console.log(`\n--- Record ${i + 1} ---`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
      
      // LinkedIn records in detail
      if (linkedInRecords.length > 0) {
        console.log('\n\n💼 LINKEDIN RECORDS IN DETAIL:\n');
        linkedInRecords.forEach((record, i) => {
          console.log(`\n--- LinkedIn Record ${i + 1} ---`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
      }
    }
  } catch (e) {
    console.log('❌ Could not access leads table:', e.message);
  }
  
  // ===== 3. CHECK ALL OTHER POSSIBLE TABLES =====
  console.log('\n\n3️⃣ CHECKING OTHER POSSIBLE TABLES:\n');
  
  const otherTables = [
    'form_submissions',
    'contact_forms',
    'early_access',
    'beta_signups',
    'interest',
    'marketing_leads',
    'prospects'
  ];
  
  for (const tableName of otherTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(100);
      
      if (!error && data && data.length > 0) {
        console.log(`\n✅ Found table: ${tableName} (${data.length} records)`);
        console.log('Columns:', Object.keys(data[0]).join(', '));
        
        // Check for LinkedIn
        const linkedInRecords = data.filter(record => {
          const recordStr = JSON.stringify(record).toLowerCase();
          return recordStr.includes('linkedin');
        });
        console.log(`LinkedIn mentions: ${linkedInRecords.length}`);
      }
    } catch (e) {
      // Table doesn't exist
    }
  }
  
  // ===== 4. SUMMARY =====
  console.log('\n\n📊 FINAL SUMMARY:\n');
  console.log('='.repeat(80));
  console.log('\n✅ API Signups (from auth.users) Nov 9-16, 2025: 28 users');
  console.log('\n📋 Interest Form / Waitlist Data:');
  console.log('   - Check results above for discovered tables and records');
  console.log('   - Look for fields like "source", "referral", "how_did_you_hear", etc.');
  console.log('\n💡 If no interest form data found, it may be stored in:');
  console.log('   - External service (Typeform, Google Forms, etc.)');
  console.log('   - Different Supabase project');
  console.log('   - Marketing automation tool (HubSpot, Mailchimp, etc.)');
  
  process.exit(0);
}

checkInterestFormsDetailed();

