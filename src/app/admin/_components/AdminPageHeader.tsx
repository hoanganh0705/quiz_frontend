'use client'

import type React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

interface AdminPageHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  actionIcon?: LucideIcon
  onAction?: () => void
}

export function AdminPageHeader({
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction
}: AdminPageHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6'>
      <div>
        <h1 className='text-2xl font-bold text-foreground'>{title}</h1>
        {description && (
          <p className='text-sm text-muted-foreground mt-1'>{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className='gap-2 shrink-0'>
          {ActionIcon && <ActionIcon className='h-4 w-4' />}
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
