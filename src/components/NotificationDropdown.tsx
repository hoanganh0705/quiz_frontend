'use client'

import {
  Bell,
  Trophy,
  MessageCircle,
  Star,
  Clock,
  Check,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Notification {
  id: string
  type: 'achievement' | 'message' | 'quiz' | 'challenge' | 'system'
  title: string
  description: string
  time: string
  read: boolean
  avatar?: string
  avatarFallback?: string
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'New Achievement Unlocked!',
    description:
      'You earned the "Quiz Master" badge for completing 50 quizzes.',
    time: '2 min ago',
    read: false
  },
  {
    id: '2',
    type: 'message',
    title: 'Sarah Johnson',
    description: 'Hey! Want to join my quiz tournament this weekend?',
    time: '15 min ago',
    read: false,
    avatar: '/avatarPlaceholder.webp',
    avatarFallback: 'SJ'
  },
  {
    id: '3',
    type: 'challenge',
    title: 'Daily Challenge Available',
    description:
      'New daily challenge is ready. Complete it to maintain your streak!',
    time: '1 hour ago',
    read: false
  },
  {
    id: '4',
    type: 'quiz',
    title: 'Quiz Result',
    description: 'You scored 95% on "Advanced JavaScript Concepts"',
    time: '3 hours ago',
    read: true
  },
  {
    id: '5',
    type: 'system',
    title: 'Leaderboard Update',
    description: 'You moved up to #15 on the global leaderboard!',
    time: '5 hours ago',
    read: true
  },
  {
    id: '6',
    type: 'message',
    title: 'Mike Chen',
    description: 'Great quiz! I learned a lot from your questions.',
    time: '1 day ago',
    read: true,
    avatar: '/avatarPlaceholder.webp',
    avatarFallback: 'MC'
  }
]

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'achievement':
      return <Trophy className='h-4 w-4 text-yellow-500' />
    case 'message':
      return <MessageCircle className='h-4 w-4 text-blue-500' />
    case 'quiz':
      return <Star className='h-4 w-4 text-purple-500' />
    case 'challenge':
      return <Clock className='h-4 w-4 text-orange-500' />
    case 'system':
      return <Bell className='h-4 w-4 text-green-500' />
    default:
      return <Bell className='h-4 w-4 text-gray-500' />
  }
}

export function NotificationDropdown() {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className='relative'
          aria-label={`Notifications (${unreadCount} unread)`}
          type='button'
        >
          <div className='p-1.5 sm:p-2 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-main-hover transition-colors'>
            <Bell className='h-4 w-4 text-foreground' />
          </div>
          {unreadCount > 0 && (
            <div className='absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full dark:bg-white bg-black text-[0.6rem] flex items-center justify-center text-white dark:text-black'>
              <span className='text-center leading-none' aria-hidden='true'>
                {unreadCount}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-80 sm:w-96 p-0'
        sideOffset={8}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700'>
          <DropdownMenuLabel className='p-0 text-base font-semibold'>
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className='text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1'
            >
              <Check className='h-3 w-3' />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className='h-[350px]'>
          <DropdownMenuGroup>
            {notifications.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
                <Bell className='h-10 w-10 mb-2 opacity-50' />
                <p className='text-sm'>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 cursor-pointer focus:bg-muted/50 rounded-none border-b border-gray-100 dark:border-slate-800 last:border-b-0',
                    !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  {/* Icon or Avatar */}
                  <div className='shrink-0 mt-0.5'>
                    {notification.avatar ? (
                      <Avatar className='h-8 w-8'>
                        <AvatarImage src={notification.avatar} />
                        <AvatarFallback className='text-xs'>
                          {notification.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center'>
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <p
                        className={cn(
                          'text-sm truncate',
                          !notification.read
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground/80'
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className='h-2 w-2 rounded-full bg-blue-500 shrink-0' />
                      )}
                    </div>
                    <p className='text-xs text-muted-foreground line-clamp-2 mt-0.5'>
                      {notification.description}
                    </p>
                    <p className='text-xs text-muted-foreground/70 mt-1'>
                      {notification.time}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => deleteNotification(notification.id, e)}
                    className='shrink-0 p-1 hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100 hover:opacity-100'
                    aria-label='Delete notification'
                  >
                    <Trash2 className='h-3.5 w-3.5 text-muted-foreground hover:text-destructive' />
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </ScrollArea>

        {/* Footer */}
        <DropdownMenuSeparator className='m-0' />
        <div className='p-2'>
          <button className='w-full text-center text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 py-2 hover:bg-muted/50 rounded-md transition-colors'>
            View all notifications
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
