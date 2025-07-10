'use client'

import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Breadcrumb() {
  const pathname = usePathname()
  
  const pathSegments = pathname.split('/').filter(Boolean)
  
  if (pathSegments.length === 0) {
    return (
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Home className="h-4 w-4" />
        <span>Dashboard</span>
      </nav>
    )
  }
  
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Link href="/" className="flex items-center hover:text-foreground">
        <Home className="h-4 w-4" />
        <span className="ml-1">Dashboard</span>
      </Link>
      
      {pathSegments.map((segment, index) => {
        const href = '/' + pathSegments.slice(0, index + 1).join('/')
        const isLast = index === pathSegments.length - 1
        const name = segment.charAt(0).toUpperCase() + segment.slice(1)
        
        return (
          <div key={segment} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-2" />
            {isLast ? (
              <span className="text-foreground">{name}</span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {name}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
} 