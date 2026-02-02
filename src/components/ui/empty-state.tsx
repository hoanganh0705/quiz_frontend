'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  icon?: LucideIcon
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actions?: EmptyStateAction[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      iconWrapper: 'p-3 mb-3',
      icon: 'h-6 w-6',
      title: 'text-base',
      description: 'text-xs max-w-[250px]'
    },
    md: {
      container: 'py-12',
      iconWrapper: 'p-4 mb-4',
      icon: 'h-8 w-8',
      title: 'text-lg',
      description: 'text-sm max-w-sm'
    },
    lg: {
      container: 'py-16',
      iconWrapper: 'p-6 mb-4',
      icon: 'h-12 w-12',
      title: 'text-xl',
      description: 'text-base max-w-md'
    }
  }

  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        sizes.container,
        className
      )}
    >
      <div className={cn('rounded-full bg-muted', sizes.iconWrapper)}>
        <Icon className={cn('text-muted-foreground', sizes.icon)} />
      </div>
      <h3 className={cn('font-semibold mb-2 text-foreground', sizes.title)}>
        {title}
      </h3>
      <p className={cn('text-muted-foreground mb-6', sizes.description)}>
        {description}
      </p>
      {actions && actions.length > 0 && (
        <div className='flex flex-wrap gap-3 justify-center'>
          {actions.map((action, index) => {
            const ActionIcon = action.icon
            const buttonContent = (
              <>
                {ActionIcon && <ActionIcon className='mr-2 h-4 w-4' />}
                {action.label}
              </>
            )

            if (action.href) {
              return (
                <Button
                  key={index}
                  variant={
                    action.variant || (index === 0 ? 'default' : 'outline')
                  }
                  asChild
                  className={
                    index === 0
                      ? 'bg-default hover:bg-default-hover text-white'
                      : ''
                  }
                >
                  <a href={action.href}>{buttonContent}</a>
                </Button>
              )
            }

            return (
              <Button
                key={index}
                variant={
                  action.variant || (index === 0 ? 'default' : 'outline')
                }
                onClick={action.onClick}
                className={
                  index === 0
                    ? 'bg-default hover:bg-default-hover text-white'
                    : ''
                }
              >
                {buttonContent}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
