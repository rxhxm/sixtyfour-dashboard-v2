const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iszvhmzqbaplwemstyzy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzenZobXpxYmFwbHdlbXN0eXp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzMxMDEyMCwiZXhwIjoyMDU4ODg2MTIwfQ.xmdewtOi9WvsY3XHPxs5Z_qikUkjozBnyhi7ozUESg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserMetadata() {
  console.log('🔍 CHECKING USER METADATA FOR SOURCE/REFERRAL INFO\n');
  console.log('='.repeat(80));
  
  const startDate = new Date('2025-11-09T00:00:00Z');
  const endDate = new Date('2025-11-16T23:59:59Z');
  
  // Get all users
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
  
  // Filter Nov 9-16 signups
  const signupsInPeriod = allUsers.filter(user => {
    const createdAt = new Date(user.created_at);
    return createdAt >= startDate && createdAt <= endDate;
  });
  
  console.log(`\n📊 Analyzing ${signupsInPeriod.length} signups from Nov 9-16, 2025\n`);
  console.log('='.repeat(80));
  
  // Check each user's full data structure
  console.log('\n🔍 FULL USER DATA STRUCTURE:\n');
  
  signupsInPeriod.forEach((user, i) => {
    console.log(`\n--- User ${i + 1}: ${user.email} ---`);
    console.log(`Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log(`ID: ${user.id}`);
    
    // Check user_metadata
    if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
      console.log('\n📋 User Metadata:');
      Object.entries(user.user_metadata).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    } else {
      console.log('\n📋 User Metadata: (empty)');
    }
    
    // Check app_metadata
    if (user.app_metadata && Object.keys(user.app_metadata).length > 0) {
      console.log('\n📱 App Metadata:');
      Object.entries(user.app_metadata).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }
    
    // Check raw_user_meta_data (sometimes different from user_metadata)
    if (user.raw_user_meta_data && Object.keys(user.raw_user_meta_data).length > 0) {
      console.log('\n🔧 Raw User Metadata:');
      Object.entries(user.raw_user_meta_data).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }
    
    // Check for any fields that might contain source/referral info
    const userStr = JSON.stringify(user).toLowerCase();
    const hasLinkedIn = userStr.includes('linkedin');
    const hasSource = userStr.includes('source') || userStr.includes('referral') || userStr.includes('utm');
    
    if (hasLinkedIn) {
      console.log('\n💼 ✅ MENTIONS LINKEDIN!');
    }
    if (hasSource) {
      console.log('\n🎯 ✅ CONTAINS SOURCE/REFERRAL INFO!');
    }
    
    console.log('\n' + '-'.repeat(80));
  });
  
  // Count LinkedIn mentions
  const linkedInUsers = signupsInPeriod.filter(user => {
    const userStr = JSON.stringify(user).toLowerCase();
    return userStr.includes('linkedin') || userStr.includes('linked in');
  });
  
  console.log('\n\n📊 SUMMARY:\n');
  console.log('='.repeat(80));
  console.log(`\n✅ Total signups Nov 9-16, 2025: ${signupsInPeriod.length}`);
  console.log(`💼 Users with LinkedIn mention: ${linkedInUsers.length}`);
  
  if (linkedInUsers.length > 0) {
    console.log('\n💼 LinkedIn users:');
    linkedInUsers.forEach(user => {
      console.log(`  - ${user.email}`);
    });
  }
  
  // Export detailed report
  const fs = require('fs');
  const report = signupsInPeriod.map(user => {
    const userStr = JSON.stringify(user).toLowerCase();
    const hasLinkedIn = userStr.includes('linkedin');
    
    return {
      email: user.email,
      created_at: user.created_at,
      user_id: user.id,
      has_linkedin: hasLinkedIn ? 'YES' : 'NO',
      user_metadata: JSON.stringify(user.user_metadata || {}),
      app_metadata: JSON.stringify(user.app_metadata || {})
    };
  });
  
  const csv = [
    'email,created_at,user_id,has_linkedin,user_metadata,app_metadata'
  ].concat(
    report.map(r => 
      `"${r.email}","${r.created_at}","${r.user_id}","${r.has_linkedin}","${r.user_metadata.replace(/"/g, '""')}","${r.app_metadata.replace(/"/g, '""')}"`
    )
  ).join('\n');
  
  fs.writeFileSync('signups-detailed-nov9-16-2025.csv', csv);
  console.log('\n✅ Exported detailed report to: signups-detailed-nov9-16-2025.csv');
  
  process.exit(0);
}

checkUserMetadata();

