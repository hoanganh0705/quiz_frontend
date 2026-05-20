'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface GuestAccessBannerProps {
  title?: string
  description?: string
  ctaHref?: string
  ctaLabel?: string
}

export function GuestAccessBanner({
  title = 'Guest mode',
  description = 'Sign in to save progress, join leaderboards, and sync across devices.',
  ctaHref = '/login',
  ctaLabel = 'Sign in to save'
}: GuestAccessBannerProps) {
  return (
    <div className='rounded-lg border border-border bg-muted/40 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        <div className='text-sm font-semibold text-foreground'>{title}</div>
        <div className='text-xs text-muted-foreground'>{description}</div>
      </div>
      <Button asChild size='sm' className='w-full sm:w-auto'>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  )
}
