'use client'

import { Activity, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'API Usage', href: '/', icon: Activity },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
]

export function Sidebar() {
  const pathname = usePathname()
  
  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold">Sixtyfour</h1>
      </div>
      <nav className="mt-8">
        <ul className="space-y-2 px-4">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
} 