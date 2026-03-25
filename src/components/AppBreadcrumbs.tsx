'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { memo, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'

function titleCase(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const AppBreadcrumbs = memo(function AppBreadcrumbs() {
  const pathname = usePathname()

  const crumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)

    return segments.map((segment, index) => ({
      label: titleCase(segment),
      href: `/${segments.slice(0, index + 1).join('/')}`
    }))
  }, [pathname])

  if (crumbs.length === 0) return null

  return (
    <nav aria-label='Breadcrumb' className='px-4 md:px-6 pt-3'>
      <ol className='flex items-center gap-1 text-xs text-foreground/60'>
        <li>
          <Link href='/' className='hover:text-foreground'>
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li key={crumb.href} className='flex items-center gap-1'>
              <ChevronRight className='h-3 w-3' aria-hidden='true' />
              {isLast ? (
                <span className='text-foreground'>{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className='hover:text-foreground'>
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
})
