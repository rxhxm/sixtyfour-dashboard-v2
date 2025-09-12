// Optimized parallel fetching for Langfuse API
// Based on research: 5-10 concurrent requests is optimal

export async function fetchInBatches<T>(
  fetchFunction: (page: number) => Promise<T>,
  totalPages: number,
  batchSize: number = 5 // Research shows 5-10 is optimal
): Promise<T[]> {
  const results: T[] = []
  
  console.log(`🚀 Starting parallel fetch: ${totalPages} pages in batches of ${batchSize}`)
  const startTime = Date.now()
  
  // Process pages in batches
  for (let i = 0; i < totalPages; i += batchSize) {
    const batchStart = i + 1
    const batchEnd = Math.min(i + batchSize, totalPages)
    const batchPromises: Promise<T>[] = []
    
    // Create promises for this batch
    for (let page = batchStart; page <= batchEnd; page++) {
      batchPromises.push(fetchFunction(page))
    }
    
    // Execute batch in parallel
    const batchStartTime = Date.now()
    const batchResults = await Promise.all(batchPromises)
    const batchTime = Date.now() - batchStartTime
    
    results.push(...batchResults)
    
    console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(totalPages/batchSize)} completed: Pages ${batchStart}-${batchEnd} in ${batchTime}ms`)
  }
  
  const totalTime = Date.now() - startTime
  console.log(`🎯 All ${totalPages} pages fetched in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
  
  return results
}

// Test different batch sizes to find optimal performance
export async function testBatchSizes(
  fetchFunction: (page: number) => Promise<any>,
  totalPages: number = 10
): Promise<{ batchSize: number; time: number }[]> {
  const testSizes = [1, 3, 5, 8, 10, 15, 20]
  const results: { batchSize: number; time: number }[] = []
  
  console.log('🧪 Testing optimal batch sizes...')
  
  for (const batchSize of testSizes) {
    const startTime = Date.now()
    
    try {
      await fetchInBatches(fetchFunction, totalPages, batchSize)
      const time = Date.now() - startTime
      
      results.push({ batchSize, time })
      console.log(`Batch size ${batchSize}: ${time}ms`)
      
      // Add small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed with batch size ${batchSize}:`, error)
      results.push({ batchSize, time: -1 })
    }
  }
  
  // Find optimal batch size
  const validResults = results.filter(r => r.time > 0)
  const optimal = validResults.reduce((best, current) => 
    current.time < best.time ? current : best
  )
  
  console.log(`\n🏆 Optimal batch size: ${optimal.batchSize} (${optimal.time}ms)`)
  
  return results
}

// Parallel fetch with progress callback
export async function fetchWithProgress<T>(
  fetchFunction: (page: number) => Promise<T>,
  totalPages: number,
  batchSize: number = 5,
  onProgress?: (current: number, total: number) => void
): Promise<T[]> {
  const results: T[] = []
  let completed = 0
  
  for (let i = 0; i < totalPages; i += batchSize) {
    const batchStart = i + 1
    const batchEnd = Math.min(i + batchSize, totalPages)
    const batchPromises: Promise<T>[] = []
    
    for (let page = batchStart; page <= batchEnd; page++) {
      batchPromises.push(
        fetchFunction(page).then(result => {
          completed++
          onProgress?.(completed, totalPages)
          return result
        })
      )
    }
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }
  
  return results
}

// Smart batching that adjusts based on response times
export class AdaptiveBatcher {
  private batchSize: number = 5
  private minBatchSize: number = 2
  private maxBatchSize: number = 15
  private targetResponseTime: number = 2000 // Target 2 seconds per batch
  
  async fetchAdaptive<T>(
    fetchFunction: (page: number) => Promise<T>,
    totalPages: number
  ): Promise<T[]> {
    const results: T[] = []
    let currentBatch = 0
    
    console.log(`🤖 Starting adaptive fetching with initial batch size: ${this.batchSize}`)
    
    for (let i = 0; i < totalPages; i += this.batchSize) {
      currentBatch++
      const batchStart = i + 1
      const batchEnd = Math.min(i + this.batchSize, totalPages)
      const batchPromises: Promise<T>[] = []
      
      for (let page = batchStart; page <= batchEnd; page++) {
        batchPromises.push(fetchFunction(page))
      }
      
      const batchStartTime = Date.now()
      const batchResults = await Promise.all(batchPromises)
      const batchTime = Date.now() - batchStartTime
      
      results.push(...batchResults)
      
      // Adjust batch size based on response time
      if (batchTime < this.targetResponseTime * 0.7 && this.batchSize < this.maxBatchSize) {
        this.batchSize = Math.min(this.batchSize + 2, this.maxBatchSize)
        console.log(`⬆️ Increasing batch size to ${this.batchSize} (response was fast: ${batchTime}ms)`)
      } else if (batchTime > this.targetResponseTime * 1.3 && this.batchSize > this.minBatchSize) {
        this.batchSize = Math.max(this.batchSize - 1, this.minBatchSize)
        console.log(`⬇️ Decreasing batch size to ${this.batchSize} (response was slow: ${batchTime}ms)`)
      }
      
      console.log(`Batch ${currentBatch}: Pages ${batchStart}-${batchEnd} in ${batchTime}ms`)
    }
    
    return results
  }
}
