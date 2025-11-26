'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { Loader2, Bot, Zap } from 'lucide-react'

export default function ModelTestPage() {
  const [prompt, setPrompt] = useState('')
  const [numResponses, setNumResponses] = useState(1)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleTest = async () => {
    if (!prompt) return
    
    setLoading(true)
    setResults([])
    
    try {
      const response = await fetch('/api/test-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, n: numResponses })
      })
      
      const data = await response.json()
      if (data.results) {
        setResults(data.results)
      } else if (data.error) {
        console.error('API Error:', data.error)
      }
    } catch (error) {
      console.error('Test failed', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Model Testing Playground
          </h1>
          <p className="text-muted-foreground mt-2">
            Test Claude responses with hardcoded credentials.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Input Section */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea 
                  placeholder="Enter your prompt here..." 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Response Count (n)</Label>
                  <span className="text-sm font-bold">{numResponses}</span>
                </div>
                <Input 
                  type="number" 
                  min="1" 
                  max="10" 
                  value={numResponses} 
                  onChange={(e) => setNumResponses(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Generates {numResponses} parallel responses.
                </p>
              </div>

              <Button 
                onClick={handleTest} 
                disabled={loading || !prompt}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {results.length > 0 
                  ? `Showing ${results.length} responses` 
                  : 'Run a test to see output'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((res, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                    <div className="font-semibold text-sm text-muted-foreground mb-2">
                      Response #{res.index}
                    </div>
                    {res.error ? (
                      <div className="text-red-500 text-sm">{res.error}</div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">{res.content}</div>
                    )}
                  </div>
                ))}
                {results.length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    No results yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
