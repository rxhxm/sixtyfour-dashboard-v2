'use client'

import { Rnd } from 'react-rnd'
import { X } from 'lucide-react'
import { ReactNode, useState, useEffect } from 'react'

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

  // Recenter modal whenever it opens - based on CURRENT viewport scroll position
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      // Get current scroll position
      const scrollX = window.scrollX || window.pageXOffset
      const scrollY = window.scrollY || window.pageYOffset
      
      // Center on current viewport (not the page)
      const x = scrollX + (window.innerWidth - size.width) / 2
      const y = scrollY + (window.innerHeight - size.height) / 2
      
      setPosition({ x, y })
    }
  }, [open, size.width, size.height])
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

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
        enableResizing={{
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
        resizeHandleStyles={{
          top: { 
            cursor: 'n-resize',
            height: '10px',
            width: '100%',
            top: '0',
            background: 'transparent',
          },
          right: { 
            cursor: 'e-resize',
            width: '10px',
            height: '100%',
            right: '0',
            background: 'transparent',
          },
          bottom: { 
            cursor: 's-resize',
            height: '10px',
            width: '100%',
            bottom: '0',
            background: 'transparent',
          },
          left: { 
            cursor: 'w-resize',
            width: '10px',
            height: '100%',
            left: '0',
            background: 'transparent',
          },
          topRight: { 
            cursor: 'ne-resize',
            width: '20px',
            height: '20px',
            top: '0',
            right: '0',
            background: 'transparent',
          },
          bottomRight: { 
            cursor: 'se-resize',
            width: '20px',
            height: '20px',
            bottom: '0',
            right: '0',
            background: 'transparent',
          },
          bottomLeft: { 
            cursor: 'sw-resize',
            width: '20px',
            height: '20px',
            bottom: '0',
            left: '0',
            background: 'transparent',
          },
          topLeft: { 
            cursor: 'nw-resize',
            width: '20px',
            height: '20px',
            top: '0',
            left: '0',
            background: 'transparent',
          },
        }}
        resizeHandleComponent={{
          bottomRight: <div className="resize-handle resize-handle-br" />,
          bottomLeft: <div className="resize-handle resize-handle-bl" />,
          topRight: <div className="resize-handle resize-handle-tr" />,
          topLeft: <div className="resize-handle resize-handle-tl" />,
          bottom: <div className="resize-handle-edge" />,
          right: <div className="resize-handle-edge" />,
          top: <div className="resize-handle-edge" />,
          left: <div className="resize-handle-edge" />,
        }}
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

