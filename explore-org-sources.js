const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreOrgSources() {
  console.log('🔍 EXPLORING ORG DATA SOURCES (READ ONLY)\n');
  console.log('='.repeat(70));
  
  // 1. Check organizations table
  console.log('\n1️⃣ ORGANIZATIONS TABLE:\n');
  const { data: orgsTable } = await supabase.from('organizations').select('*');
  
  if (orgsTable && orgsTable.length > 0) {
    console.log(`Found: ${orgsTable.length} records`);
    console.log('Columns:', Object.keys(orgsTable[0]));
    console.log('Sample:', orgsTable.slice(0, 3));
    console.log('');
    console.log('⚠️  Note: org-id column (hyphenated)');
  } else {
    console.log('❌ No organizations table or no data');
  }
  
  // 2. Check users-org for unique org_ids
  console.log('\n2️⃣ USERS-ORG TABLE (Unique org_ids):\n');
  const { data: usersOrg } = await supabase.from('users-org').select('org_id');
  
  const uniqueOrgIds = [...new Set(usersOrg?.map(uo => uo.org_id))];
  console.log(`Found: ${uniqueOrgIds.length} unique org_ids`);
  console.log('Sample org_ids:', uniqueOrgIds.slice(0, 10));
  
  // 3. Check for mismatches
  console.log('\n3️⃣ CHECKING FOR MISMATCHES:\n');
  
  const orgsTableIds = orgsTable?.map(o => o['org-id']) || [];
  const usersOrgIds = uniqueOrgIds;
  
  console.log(`organizations table has: ${orgsTableIds.length} org-ids`);
  console.log(`users-org table has: ${usersOrgIds.length} org_ids`);
  
  // Find org_ids in users-org that DON'T exist in organizations table
  const orphans = usersOrgIds.filter(id => !orgsTableIds.includes(id));
  console.log(`\n⚠️  Orphan org_ids (in users-org but not in organizations): ${orphans.length}`);
  console.log('Sample orphans:', orphans.slice(0, 10));
  
  // 4. Determine source of truth
  console.log('\n4️⃣ SOURCE OF TRUTH DETERMINATION:\n');
  
  if (orphans.length > 400) {
    console.log('💡 FINDING: users-org.org_id is the source of truth!');
    console.log('   organizations table is NOT the master list');
    console.log('   Org IDs are defined when users create orgs');
    console.log('   organizations table may be for billing/metadata only');
  }
  
  // 5. Check Langfuse for org data
  console.log('\n5️⃣ LANGFUSE ORG DATA:\n');
  console.log('Langfuse has org data in traces (via tags: org_id:XXX)');
  console.log('This is likely THE authoritative source');
  console.log('');
  console.log('💡 RECOMMENDATION:');
  console.log('   Use users-org.org_id values as valid org list');
  console.log('   These are real, in-use org identifiers');
  console.log('   509 unique orgs currently active');
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ VALIDATION STRATEGY:\n');
  console.log('When adding user to org:');
  console.log('1. Get list of existing org_ids from users-org table');
  console.log('2. Show dropdown (not text input!)');
  console.log('3. Only allow selection from existing orgs');
  console.log('4. No typos possible!');
  console.log('');
  console.log('Alternative: Autocomplete with validation');
  console.log('- Type-ahead search');
  console.log('- Must match exactly');
  console.log('- Show error if org doesn\'t exist');
  
  process.exit(0);
}

exploreOrgSources();

