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

const SEGMENT_NAME_MAP: Record<string, string> = {
  quizzes: 'Quizzes',
  categories: 'Categories',
  tags: 'Tags',
  'daily-challenge': "Today's Challenge",
  leaderboard: 'Leaderboard',
  rankings: 'Rankings',
  achievements: 'Achievements',
  coins: 'Coins Wallet',
  friends: 'Friends',
  social: 'Social',
  tournaments: 'Tournaments',
  tournament: 'Tournaments',
  instances: 'Live Battles',
  'create-quiz': 'Create Quiz',
  'my-quizzes': 'My Quizzes',
  'my-profile': 'My Profile',
  'quiz-history': 'Quiz History',
  bookmarks: 'Bookmarks',
  notifications: 'Notifications',
  settings: 'Settings',
  support: 'Support',
  attempt: 'Active Quiz',
  results: 'Quiz Results',
  admin: 'Admin',
  audit: 'Audit Logs',
  reports: 'Reports',
  users: 'Users',
  roles: 'Roles'
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HASH_OR_ID_REGEX = /^[0-9a-f]{16,}$/i

function formatSegmentLabel(segment: string, prevSegment?: string): string {
  if (SEGMENT_NAME_MAP[segment]) {
    return SEGMENT_NAME_MAP[segment]!
  }
  if (UUID_REGEX.test(segment) || HASH_OR_ID_REGEX.test(segment)) {
    if (prevSegment === 'quiz-history') return 'Attempt Details'
    if (prevSegment === 'users') return 'User Details'
    if (prevSegment === 'tournaments') return 'Tournament Details'
    if (prevSegment === 'instances') return 'Live Match'
    if (prevSegment === 'versions') return 'Version Details'
    return `#${segment.slice(0, 8)}…`
  }
  return titleCase(segment)
}

export const AppBreadcrumbs = memo(function AppBreadcrumbs() {
  const pathname = usePathname()

  const crumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)

    return segments.map((segment, index) => {
      const prev = index > 0 ? segments[index - 1] : undefined
      return {
        label: formatSegmentLabel(segment, prev),
        href: `/${segments.slice(0, index + 1).join('/')}`
      }
    })
  }, [pathname])

  if (crumbs.length === 0) return null

  return (
    <nav aria-label='Breadcrumb' className='px-4 md:px-6 pt-1.5 pb-0.5 md:pt-2'>
      <ol className='flex items-center gap-1 text-xs text-foreground-secondary overflow-x-auto whitespace-nowrap scrollbar-none'>
        <li>
          <Link href='/' className='hover:text-foreground transition-colors'>
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li key={crumb.href} className='flex items-center gap-1 shrink-0'>
              <ChevronRight className='h-3 w-3 text-muted-foreground/60' aria-hidden='true' />
              {isLast ? (
                <span className='text-foreground font-medium'>{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className='hover:text-foreground transition-colors'>
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
