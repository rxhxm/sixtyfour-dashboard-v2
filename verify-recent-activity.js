const fetch = require('node-fetch');

async function verifyRecentActivity() {
  console.log('🔍 Verifying Recently Active accuracy...\n');
  
  const orgs = ['Conduit', 'josh-sixtyfour', 'Pazago', 'Stealth-uzb', 'Hashim'];
  
  const now = new Date();
  const endDate = now.toISOString();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  console.log('Time range:', startDate, 'to', endDate);
  console.log('');
  
  for (const org of orgs) {
    try {
      const url = `http://localhost:3000/api/recent-api-calls?limit=1&orgId=${org}&startDate=${startDate}&endDate=${endDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.calls && data.calls.length > 0) {
        const call = data.calls[0];
        const timestamp = new Date(call.timestamp);
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        const timeAgo = diffMins < 60 ? `${diffMins}m ago` : `${diffHours}h ago`;
        
        console.log(`${org}:`);
        console.log(`  Timestamp: ${call.timestamp}`);
        console.log(`  Time ago: ${timeAgo}`);
        console.log(`  Card shows: ${call.timeAgo}`);
        console.log(`  ✅ Match: ${timeAgo === call.timeAgo ? 'YES' : 'VERIFY'}`);
        console.log('');
      } else {
        console.log(`${org}: ❌ No recent activity found`);
        console.log('');
      }
    } catch (error) {
      console.log(`${org}: ❌ Error:`, error.message);
      console.log('');
    }
  }
}

verifyRecentActivity();


async function verifyRecentActivity() {
  console.log('🔍 Verifying Recently Active accuracy...\n');
  
  const orgs = ['Conduit', 'josh-sixtyfour', 'Pazago', 'Stealth-uzb', 'Hashim'];
  
  const now = new Date();
  const endDate = now.toISOString();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  console.log('Time range:', startDate, 'to', endDate);
  console.log('');
  
  for (const org of orgs) {
    try {
      const url = `http://localhost:3000/api/recent-api-calls?limit=1&orgId=${org}&startDate=${startDate}&endDate=${endDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.calls && data.calls.length > 0) {
        const call = data.calls[0];
        const timestamp = new Date(call.timestamp);
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        const timeAgo = diffMins < 60 ? `${diffMins}m ago` : `${diffHours}h ago`;
        
        console.log(`${org}:`);
        console.log(`  Timestamp: ${call.timestamp}`);
        console.log(`  Time ago: ${timeAgo}`);
        console.log(`  Card shows: ${call.timeAgo}`);
        console.log(`  ✅ Match: ${timeAgo === call.timeAgo ? 'YES' : 'VERIFY'}`);
        console.log('');
      } else {
        console.log(`${org}: ❌ No recent activity found`);
        console.log('');
      }
    } catch (error) {
      console.log(`${org}: ❌ Error:`, error.message);
      console.log('');
    }
  }
}

verifyRecentActivity();

