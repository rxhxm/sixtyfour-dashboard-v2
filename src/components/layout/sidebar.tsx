'use client'

import { Activity, Workflow, UserPlus, Coins, Building2, Users, LayoutTemplate, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { useState } from 'react'

const dashboardNav = [
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'API Usage', href: '/api-usage', icon: Activity },
  { name: 'Signups', href: '/signups', icon: Users },
]

const adminNav = [
  { name: 'Templates', href: '/workflow-templates', icon: LayoutTemplate },
  { name: 'Platform Access', href: '/platform-access', icon: UserPlus },
  { name: 'Org Access', href: '/org-access', icon: Building2 },
  { name: 'Credits Management', href: '/credits-management', icon: Coins },
]

export function Sidebar() {
  const pathname = usePathname()
  const [dashboardOpen, setDashboardOpen] = useState(true)
  const [adminOpen, setAdminOpen] = useState(true)
  
  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r">
      <div className="flex h-16 items-center px-6 gap-3">
        <Logo width={32} height={32} />
        <h1 className="text-xl font-bold">Sixtyfour</h1>
      </div>
      <nav className="mt-6">
        {/* Dashboard Section */}
        <div className="px-4 mb-2">
          <button
            onClick={() => setDashboardOpen(!dashboardOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Dashboard
            <ChevronDown className={cn("h-4 w-4 transition-transform", dashboardOpen ? "" : "-rotate-90")} />
          </button>
          {dashboardOpen && (
            <ul className="mt-1 space-y-1">
              {dashboardNav.map((item) => (
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
          )}
        </div>

        {/* Admin Section */}
        <div className="px-4 mt-4">
          <button
            onClick={() => setAdminOpen(!adminOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Admin
            <ChevronDown className={cn("h-4 w-4 transition-transform", adminOpen ? "" : "-rotate-90")} />
          </button>
          {adminOpen && (
            <ul className="mt-1 space-y-1">
              {adminNav.map((item) => (
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
          )}
        </div>
      </nav>
    </div>
  )
}
