'use client'
import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/Button'

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Không render gì hết cho đến khi mount xong
  // Tránh hoàn toàn aria-pressed mismatch
  if (!mounted) {
    return (
      <Button
        size='icon'
        disabled
        className='h-8 w-8 bg-transparent border border-border'
      />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      size='icon'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-pressed={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className='h-8 w-8 text-foreground hover:bg-main-hover border-border transition-colors bg-transparent border'
    >
      <Sun className='h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground' />
      <Moon className='absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground' />
      <span className='sr-only'>Toggle theme</span>
    </Button>
  )
}
