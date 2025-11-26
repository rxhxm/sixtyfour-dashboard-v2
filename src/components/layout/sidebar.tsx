import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, Activity, Workflow, UserPlus, Coins, Bot, Building2 } from 'lucide-react'

const navigation = [
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'API Usage', href: '/api-usage', icon: Activity },
  { name: 'Platform Access', href: '/platform-access', icon: UserPlus },
  { name: 'Org Access', href: '/org-access', icon: Building2 },
  { name: 'Credits Management', href: '/credits-management', icon: Coins },
  { name: 'Model Test', href: '/model-test', icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-900 px-6 pb-4 border-r border-gray-200 dark:border-gray-800">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="h-8 w-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
            <span className="text-white dark:text-black">64</span>
          </div>
          <span>Sixtyfour</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        isActive
                          ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                          : 'text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-black dark:text-white' : 'text-gray-400 group-hover:text-black dark:group-hover:text-white',
                          'h-6 w-6 shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  )
}
