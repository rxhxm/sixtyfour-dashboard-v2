'use client'

import { Rnd } from 'react-rnd'
import { X } from 'lucide-react'
import { ReactNode, useState } from 'react'

interface ResizableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

export function ResizableDialog({
  open,
  onOpenChange,
  title,
  children
}: ResizableDialogProps) {
  const [size, setSize] = useState({ width: 900, height: 600 })
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Prevent background scrolling when modal is open
  if (typeof document !== 'undefined') {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }

  if (!open) return null

  // Calculate centered position on first open
  if (position.x === 0 && position.y === 0 && typeof window !== 'undefined') {
    const x = (window.innerWidth - size.width) / 2
    const y = (window.innerHeight - size.height) / 2
    setPosition({ x, y })
  }

  return (
    <>
      {/* Backdrop - Prevent scroll */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Resizable Modal */}
      <Rnd
        size={{ width: size.width, height: size.height }}
        position={{ x: position.x, y: position.y }}
        onDragStop={(e, d) => {
          setPosition({ x: d.x, y: d.y })
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height)
          })
          setPosition(position)
        }}
        minWidth={400}
        minHeight={300}
        bounds="window"
        dragHandleClassName="drag-handle"
        className="z-50 border-2 border-gray-300"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden'
        }}
      >
        {/* Header - Draggable */}
        <div className="drag-handle flex items-center justify-between p-4 border-b bg-background cursor-move">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </Rnd>
    </>
  )
}

