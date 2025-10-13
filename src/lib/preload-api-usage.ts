// Preload API Usage data in the background
export async function preloadApiUsageData() {
  console.log('🔄 Preloading API Usage data in background...')
  
  try {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
    
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
    
    // Fetch all three endpoints in parallel
    const results = await Promise.allSettled([
      fetch(`/api/metrics?${params}`).then(r => r.json()),
      fetch(`/api/langfuse-metrics?${params}`).then(r => r.json()),
      fetch(`/api/langfuse-chart-data?${params}`).then(r => r.json())
    ])
    
    let successCount = 0
    
    if (results[0].status === 'fulfilled') {
      sessionStorage.setItem('preloaded_metrics_24h', JSON.stringify(results[0].value))
      successCount++
    }
    
    if (results[1].status === 'fulfilled') {
      sessionStorage.setItem('preloaded_langfuse_24h', JSON.stringify(results[1].value))
      successCount++
    }
    
    if (results[2].status === 'fulfilled') {
      sessionStorage.setItem('preloaded_chart_24h', JSON.stringify(results[2].value))
      successCount++
    }
    
    if (successCount > 0) {
      sessionStorage.setItem('preloaded_timestamp', Date.now().toString())
      console.log(`✅ Preloaded ${successCount}/3 API Usage endpoints`)
    }
  } catch (error) {
    console.error('Preload failed:', error)
  }
}

