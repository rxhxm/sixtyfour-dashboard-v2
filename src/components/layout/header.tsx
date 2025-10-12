'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)
  
  const handleLogout = async () => {
    setLoggingOut(true)
    
    try {
      // Clear all caches
      sessionStorage.clear()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      console.log('✅ Logged out successfully')
      router.push("/auth/signin")
    } catch (error) {
      console.error('Logout error:', error)
      // Force logout anyway
      sessionStorage.clear()
      router.push("/auth/signin")
    } finally {
      setLoggingOut(false)
    }
  }
  
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-end px-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2"
        >
          {loggingOut ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </>
          )}
        </Button>
      </div>
    </header>
  )
} 