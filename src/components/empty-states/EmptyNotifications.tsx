'use client'

import { Bell, BellOff, Settings } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface EmptyNotificationsProps {
  type: 'no-notifications' | 'no-unread' | 'notifications-disabled'
  onEnableNotifications?: () => void
}

export function EmptyNotifications({
  type,
  onEnableNotifications
}: EmptyNotificationsProps) {
  if (type === 'no-notifications') {
    return (
      <EmptyState
        icon={Bell}
        title='No notifications'
        description="You're all caught up! New notifications will appear here when you have quiz updates, friend requests, or achievements."
        size='md'
        actions={[
          {
            label: 'Explore Quizzes',
            href: '/quizzes'
          },
          {
            label: 'Notification Settings',
            href: '/settings/notifications',
            variant: 'outline',
            icon: Settings
          }
        ]}
      />
    )
  }

  if (type === 'no-unread') {
    return (
      <EmptyState
        icon={Bell}
        title='No unread notifications'
        description="You've read all your notifications. Check back later for new updates!"
        size='sm'
      />
    )
  }

  if (type === 'notifications-disabled') {
    return (
      <EmptyState
        icon={BellOff}
        title='Notifications disabled'
        description='Enable notifications to stay updated on quiz invites, friend requests, achievements, and more.'
        size='md'
        actions={[
          {
            label: 'Enable Notifications',
            onClick: onEnableNotifications,
            icon: Bell
          },
          {
            label: 'Settings',
            href: '/settings/notifications',
            variant: 'outline',
            icon: Settings
          }
        ]}
      />
    )
  }

  return null
}
