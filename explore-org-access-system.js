const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreOrgAccessSystem() {
  console.log('🔍 EXPLORING ORG ACCESS MANAGEMENT SYSTEM\n');
  console.log('='.repeat(70));
  
  // 1. Understand current structure
  console.log('\n📊 CURRENT STATE:\n');
  
  const { data: usersOrg } = await supabase.from('users-org').select('*');
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  
  console.log(`users-org table: ${usersOrg?.length} mappings`);
  console.log(`auth.users: ${authUsers?.length} users`);
  
  // 2. Show what a mapping looks like
  console.log('\n📋 EXAMPLE MAPPING:');
  const sampleMapping = usersOrg?.[0];
  console.log('users-org record:', sampleMapping);
  console.log('Columns:', Object.keys(sampleMapping || {}));
  
  // 3. Find all unique org_ids
  const uniqueOrgs = [...new Set(usersOrg?.map(uo => uo.org_id))];
  console.log(`\n🏢 UNIQUE ORGS: ${uniqueOrgs.length}`);
  console.log('Sample org IDs:', uniqueOrgs.slice(0, 10).join(', '));
  
  // 4. Check who can currently access what
  console.log('\n👤 WHO HAS ACCESS TO WHAT:');
  console.log('Sample mappings:');
  
  usersOrg?.slice(0, 5).forEach(mapping => {
    const user = authUsers?.find(u => u.id === mapping.id);
    console.log(`  ${mapping.org_id}:`);
    console.log(`    User ID: ${mapping.id}`);
    console.log(`    Email: ${user?.email || 'NOT FOUND IN AUTH'}`);
    console.log('');
  });
  
  // 5. Check if roham/saarth/chris are in system
  console.log('\n🔍 CHECKING YOUR TEAM:');
  const teamEmails = ['roham@sixtyfour.ai', 'saarth@sixtyfour.ai', 'chrisprice@sixtyfour.ai'];
  
  teamEmails.forEach(email => {
    const user = authUsers?.find(u => u.email === email);
    if (user) {
      const orgMappings = usersOrg?.filter(uo => uo.id === user.id);
      console.log(`${email}:`);
      console.log(`  User ID: ${user.id}`);
      console.log(`  Has access to: ${orgMappings?.map(m => m.org_id).join(', ') || 'NO ORGS'}`);
      console.log('');
    } else {
      console.log(`${email}: NOT IN AUTH SYSTEM`);
      console.log('');
    }
  });
  
  console.log('\n='.repeat(70));
  console.log('💡 TO ADD SOMEONE TO AN ORG:\n');
  console.log('Required Info:');
  console.log('  1. User\'s email (they must exist in auth.users)');
  console.log('  2. Org ID (organization name)');
  console.log('');
  console.log('SQL to add:');
  console.log('  INSERT INTO "users-org" (id, org_id)');
  console.log('  VALUES (\'<user-uuid>\', \'<org-id>\');');
  console.log('');
  console.log('Example:');
  console.log('  User: roham@sixtyfour.ai (UUID: xyz-123)');
  console.log('  Add to: Conduit org');
  console.log('  INSERT INTO "users-org" (id, org_id)');
  console.log('  VALUES (\'xyz-123\', \'Conduit\');');
  
  process.exit(0);
}

exploreOrgAccessSystem();


const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreOrgAccessSystem() {
  console.log('🔍 EXPLORING ORG ACCESS MANAGEMENT SYSTEM\n');
  console.log('='.repeat(70));
  
  // 1. Understand current structure
  console.log('\n📊 CURRENT STATE:\n');
  
  const { data: usersOrg } = await supabase.from('users-org').select('*');
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  
  console.log(`users-org table: ${usersOrg?.length} mappings`);
  console.log(`auth.users: ${authUsers?.length} users`);
  
  // 2. Show what a mapping looks like
  console.log('\n📋 EXAMPLE MAPPING:');
  const sampleMapping = usersOrg?.[0];
  console.log('users-org record:', sampleMapping);
  console.log('Columns:', Object.keys(sampleMapping || {}));
  
  // 3. Find all unique org_ids
  const uniqueOrgs = [...new Set(usersOrg?.map(uo => uo.org_id))];
  console.log(`\n🏢 UNIQUE ORGS: ${uniqueOrgs.length}`);
  console.log('Sample org IDs:', uniqueOrgs.slice(0, 10).join(', '));
  
  // 4. Check who can currently access what
  console.log('\n👤 WHO HAS ACCESS TO WHAT:');
  console.log('Sample mappings:');
  
  usersOrg?.slice(0, 5).forEach(mapping => {
    const user = authUsers?.find(u => u.id === mapping.id);
    console.log(`  ${mapping.org_id}:`);
    console.log(`    User ID: ${mapping.id}`);
    console.log(`    Email: ${user?.email || 'NOT FOUND IN AUTH'}`);
    console.log('');
  });
  
  // 5. Check if roham/saarth/chris are in system
  console.log('\n🔍 CHECKING YOUR TEAM:');
  const teamEmails = ['roham@sixtyfour.ai', 'saarth@sixtyfour.ai', 'chrisprice@sixtyfour.ai'];
  
  teamEmails.forEach(email => {
    const user = authUsers?.find(u => u.email === email);
    if (user) {
      const orgMappings = usersOrg?.filter(uo => uo.id === user.id);
      console.log(`${email}:`);
      console.log(`  User ID: ${user.id}`);
      console.log(`  Has access to: ${orgMappings?.map(m => m.org_id).join(', ') || 'NO ORGS'}`);
      console.log('');
    } else {
      console.log(`${email}: NOT IN AUTH SYSTEM`);
      console.log('');
    }
  });
  
  console.log('\n='.repeat(70));
  console.log('💡 TO ADD SOMEONE TO AN ORG:\n');
  console.log('Required Info:');
  console.log('  1. User\'s email (they must exist in auth.users)');
  console.log('  2. Org ID (organization name)');
  console.log('');
  console.log('SQL to add:');
  console.log('  INSERT INTO "users-org" (id, org_id)');
  console.log('  VALUES (\'<user-uuid>\', \'<org-id>\');');
  console.log('');
  console.log('Example:');
  console.log('  User: roham@sixtyfour.ai (UUID: xyz-123)');
  console.log('  Add to: Conduit org');
  console.log('  INSERT INTO "users-org" (id, org_id)');
  console.log('  VALUES (\'xyz-123\', \'Conduit\');');
  
  process.exit(0);
}

exploreOrgAccessSystem();

