'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface ResizableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
}

export function ResizableModal({
  open,
  onOpenChange,
  children,
  defaultWidth = 800,
  defaultHeight = 600,
  minWidth = 400,
  minHeight = 300
}: ResizableModalProps) {
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = size.width
    const startHeight = size.height

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(minWidth, startWidth + (e.clientX - startX))
      const newHeight = Math.max(minHeight, startHeight + (e.clientY - startY))
      
      setSize({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [size, minWidth, minHeight])

  // Center modal when opened
  useEffect(() => {
    if (open) {
      const centerX = (window.innerWidth - defaultWidth) / 2
      const centerY = (window.innerHeight - defaultHeight) / 2
      setPosition({ x: Math.max(0, centerX), y: Math.max(0, centerY) })
      setSize({ width: defaultWidth, height: defaultHeight })
    }
  }, [open, defaultWidth, defaultHeight])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div
        ref={modalRef}
        className="bg-background border rounded-lg shadow-lg relative overflow-hidden"
        style={{
          width: size.width,
          height: size.height,
          left: position.x,
          top: position.y,
          position: 'fixed',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-muted"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="h-full overflow-auto p-6">
          {children}
        </div>

        {/* Resize handle */}
        <div
          ref={resizeRef}
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize ${
            isResizing ? 'bg-blue-500' : 'bg-gray-400 hover:bg-gray-500'
          } opacity-50 hover:opacity-100 transition-all`}
          onMouseDown={handleMouseDown}
          style={{
            background: 'linear-gradient(-45deg, transparent 30%, currentColor 30%, currentColor 50%, transparent 50%, transparent 80%, currentColor 80%)'
          }}
        />
        
        {/* Resize handle lines for visual feedback */}
        <div className="absolute bottom-1 right-1 pointer-events-none">
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
            </div>
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
