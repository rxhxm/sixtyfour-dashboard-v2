import { NextResponse } from 'next/server'
import { fetchLangfuseTraces } from '@/lib/langfuse'
import { testBatchSizes, fetchInBatches, AdaptiveBatcher } from '@/lib/langfuse-parallel'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const testType = searchParams.get('test') || 'batch'
  const pages = parseInt(searchParams.get('pages') || '20')
  
  console.log(`\n🔬 Starting parallel fetch test: ${testType} with ${pages} pages`)
  
  try {
    // Set up date range for last 24 hours
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
    
    const fetchOptions = {
      fromTimestamp: startDate.toISOString(),
      toTimestamp: endDate.toISOString(),
      limit: 100
    }
    
    // Create fetch function for a specific page
    const fetchPage = async (page: number) => {
      const startTime = Date.now()
      const result = await fetchLangfuseTraces({ ...fetchOptions, page })
      const duration = Date.now() - startTime
      return { page, duration, count: result?.data?.length || 0, data: result }
    }
    
    let results: any
    
    if (testType === 'optimal') {
      // Test different batch sizes to find optimal
      console.log('Testing batch sizes: 1, 3, 5, 8, 10, 15, 20')
      results = await testBatchSizes(fetchPage, pages)
      
    } else if (testType === 'adaptive') {
      // Use adaptive batching
      const batcher = new AdaptiveBatcher()
      const startTime = Date.now()
      results = await batcher.fetchAdaptive(fetchPage, pages)
      const totalTime = Date.now() - startTime
      
      results = {
        type: 'adaptive',
        totalPages: pages,
        totalTime,
        averagePageTime: totalTime / pages,
        data: results
      }
      
    } else {
      // Test specific batch size
      const batchSize = parseInt(searchParams.get('batchSize') || '5')
      const startTime = Date.now()
      
      // Sequential fetch for comparison
      console.log('\n📊 Testing SEQUENTIAL fetching first...')
      const sequentialStart = Date.now()
      const sequentialResults = []
      for (let i = 1; i <= Math.min(5, pages); i++) {
        await fetchPage(i)
        sequentialResults.push(i)
      }
      const sequentialTime = Date.now() - sequentialStart
      const sequentialAverage = sequentialTime / Math.min(5, pages)
      
      // Parallel fetch
      console.log(`\n📊 Testing PARALLEL fetching with batch size ${batchSize}...`)
      const parallelResults = await fetchInBatches(fetchPage, pages, batchSize)
      const parallelTime = Date.now() - startTime - sequentialTime
      
      // Calculate statistics
      const totalTraces = parallelResults.reduce((sum, r) => sum + r.count, 0)
      const averagePageTime = parallelResults.reduce((sum, r) => sum + r.duration, 0) / pages
      
      results = {
        comparison: {
          sequential: {
            timeFor5Pages: sequentialTime,
            averagePerPage: sequentialAverage,
            estimatedTotalTime: sequentialAverage * pages
          },
          parallel: {
            batchSize,
            totalTime: parallelTime,
            averagePerPage: parallelTime / pages,
            speedup: `${((sequentialAverage * pages) / parallelTime).toFixed(2)}x faster`
          }
        },
        stats: {
          totalPages: pages,
          totalTraces,
          batchSize,
          totalTime: parallelTime,
          averagePageTime
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 })
  }
}
