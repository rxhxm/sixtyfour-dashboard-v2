'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Maximize2, FileText } from 'lucide-react'

interface CSVData {
  headers: string[]
  rows: any[]
  totalRows: number
  preview: any[]
}

interface CSVViewerProps {
  csvData: CSVData
  filename: string
  blockName: string
  onDownload: () => void
}

export function CSVViewer({ csvData, filename, blockName, onDownload }: CSVViewerProps) {
  const [showFullscreen, setShowFullscreen] = useState(false)
  
  return (
    <>
      <Card className="mt-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {blockName} Output
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {csvData.totalRows} rows
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullscreen(true)}
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                Full View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-2">
            Preview (first 10 rows)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  {csvData.headers.map((header, idx) => (
                    <th key={idx} className="p-2 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.preview.map((row, idx) => (
                  <tr key={idx} className="border-b">
                    {csvData.headers.map((header, colIdx) => (
                      <td key={colIdx} className="p-2 max-w-[200px] truncate">
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen CSV Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {filename} ({csvData.totalRows} rows)
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b bg-muted">
                    {csvData.headers.map((header, idx) => (
                      <th key={idx} className="p-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.rows.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      {csvData.headers.map((header, colIdx) => (
                        <td key={colIdx} className="p-2">
                          {row[header] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}