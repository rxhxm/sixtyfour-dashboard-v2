const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const endDate = new Date().toISOString();

async function benchmark() {
  console.log('\n🔍 BENCHMARKING API ENDPOINTS\n');
  console.log('Time range:', startDate, 'to', endDate);
  console.log('─'.repeat(60));
  
  // Test each endpoint individually
  const endpoints = [
    { name: 'Database Metrics', url: `http://localhost:3000/api/metrics?startDate=${startDate}&endDate=${endDate}` },
    { name: 'Langfuse Metrics', url: `http://localhost:3000/api/langfuse-metrics?startDate=${startDate}&endDate=${endDate}` },
    { name: 'Langfuse Chart Data', url: `http://localhost:3000/api/langfuse-chart-data?startDate=${startDate}&endDate=${endDate}` }
  ];
  
  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      const response = await fetch(endpoint.url);
      const data = await response.json();
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`✅ ${endpoint.name.padEnd(25)} ${elapsed}s`);
    } catch (error) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`❌ ${endpoint.name.padEnd(25)} ${elapsed}s (FAILED)`);
    }
  }
  
  console.log('─'.repeat(60));
  
  // Test parallel fetching
  console.log('\n🚀 PARALLEL FETCH TEST\n');
  const parallelStart = Date.now();
  
  await Promise.all(endpoints.map(endpoint => fetch(endpoint.url).then(r => r.json())));
  
  const parallelElapsed = ((Date.now() - parallelStart) / 1000).toFixed(2);
  console.log(`✅ All 3 endpoints in parallel: ${parallelElapsed}s`);
  console.log('─'.repeat(60));
}

benchmark().catch(console.error);
