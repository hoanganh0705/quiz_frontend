'use client'

import {
  Bell,
  Trophy,
  MessageCircle,
  Star,
  Clock,
  Check,
  Trash2,
  MoreHorizontal
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
            <div className='absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full dark:bg-white bg-red-600 text-[0.6rem] flex items-center justify-center text-white dark:text-black'>
              <span className='text-center leading-none' aria-hidden='true'>
                {unreadCount}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-[calc(100vw-2rem)] sm:w-80 md:w-96 p-0 max-w-md'
        sideOffset={8}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 dark:border-slate-700'>
          <DropdownMenuLabel className='p-0 text-sm sm:text-base font-semibold'>
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className='text-[0.65rem] sm:text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5 sm:gap-1'
            >
              <Check className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
              <span className='hidden xs:inline sm:inline'>Mark all read</span>
              <span className='inline xs:hidden sm:hidden'>Mark read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className='h-[60vh] sm:h-100 max-h-125'>
          <DropdownMenuGroup>
            {notifications.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-[60vh] sm:h-100 max-h-125 text-muted-foreground'>
                <Bell className='h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-50' />
                <p className='text-xs sm:text-sm'>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer focus:bg-muted/50 rounded-none border-b border-gray-100 dark:border-slate-800 last:border-b-0',
                    !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  {/* Icon or Avatar */}
                  <div className='shrink-0 mt-0.5'>
                    {notification.avatar ? (
                      <Avatar className='h-7 w-7 sm:h-8 sm:w-8'>
                        <AvatarImage src={notification.avatar} />
                        <AvatarFallback className='text-[0.65rem] sm:text-xs'>
                          {notification.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className='h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted flex items-center justify-center'>
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 sm:gap-2'>
                      <p
                        className={cn(
                          'text-xs sm:text-sm truncate',
                          !notification.read
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground/80'
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className='h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 shrink-0' />
                      )}
                    </div>
                    <p className='text-[0.65rem] sm:text-xs text-muted-foreground line-clamp-2 mt-0.5'>
                      {notification.description}
                    </p>
                    <p className='text-[0.65rem] sm:text-xs text-muted-foreground/70 mt-0.5 sm:mt-1'>
                      {notification.time}
                    </p>
                  </div>

                  {/* Three-dot menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className='shrink-0 p-0.5 sm:p-1 hover:bg-muted rounded-md transition-colors'
                        aria-label='More options'
                      >
                        <MoreHorizontal className='h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground' />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-32 '>
                      <DropdownMenuItem
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className='text-xs flex items-center justify-between cursor-pointer text-primary hover:bg-primary focus:text-primary focus:bg-[rgba(154,141,141,0.1)]'
                      >
                        Delete
                        <Trash2 className='h-2 w-2' />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </ScrollArea>

        {/* Footer */}
        <DropdownMenuSeparator className='m-0' />
        {notifications.length !== 0 && (
          <div className='p-1.5 sm:p-2'>
            <button className='w-full text-center text-xs sm:text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 py-1.5 sm:py-2 hover:bg-muted/50 rounded-md transition-colors'>
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
