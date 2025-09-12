'use client'

import { useEffect, useState } from 'react'

interface ProgressDonutProps {
  progress: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  estimatedTime?: number // in seconds
}

export function ProgressDonut({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  label,
  sublabel,
  estimatedTime
}: ProgressDonutProps) {
  const [displayProgress, setDisplayProgress] = useState(0)
  
  useEffect(() => {
    // Animate the progress
    const timer = setTimeout(() => setDisplayProgress(progress), 100)
    return () => clearTimeout(timer)
  }, [progress])
  
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (displayProgress / 100) * circumference
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  
  return (
    <div className="relative inline-flex flex-col items-center">
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-primary transition-all duration-500 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">
            {Math.round(displayProgress)}%
          </span>
          {estimatedTime !== undefined && estimatedTime > 0 && (
            <span className="text-xs text-muted-foreground">
              ~{formatTime(estimatedTime)}
            </span>
          )}
        </div>
      </div>
      {label && (
        <div className="mt-3 text-center">
          <p className="text-sm font-medium">{label}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
          )}
        </div>
      )}
    </div>
  )
}



