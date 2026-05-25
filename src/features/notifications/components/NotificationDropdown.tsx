'use client'

import {
  Bell,
  BellOff,
  Trophy,
  MessageCircle,
  Star,
  Clock,
  Check,
  Trash2,
  MoreHorizontal,
  X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { cn } from '@/shared/utils/merge-class-names'
import { useEffect, useCallback, useState } from 'react'
import {
  type Notification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification as apiDeleteNotification
} from '@/features/notifications/api'

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

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'New Achievement Unlocked!',
    description:
      'You earned the "Quiz Master" badge for completing 50 quizzes.',
    time: '2 min ago',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    type: 'message',
    title: 'Sarah Johnson',
    description: 'Hey! Want to join my quiz tournament this weekend?',
    time: '15 min ago',
    read: false,
    avatar: '/avatarPlaceholder.webp',
    avatarFallback: 'SJ',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    type: 'challenge',
    title: 'Daily Challenge Available',
    description:
      'New daily challenge is ready. Complete it to maintain your streak!',
    time: '1 hour ago',
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    type: 'quiz',
    title: 'Quiz Result',
    description: 'You scored 95% on "Advanced JavaScript Concepts"',
    time: '3 hours ago',
    read: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    type: 'system',
    title: 'Leaderboard Update',
    description: 'You moved up to #15 on the global leaderboard!',
    time: '5 hours ago',
    read: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '6',
    type: 'message',
    title: 'Mike Chen',
    description: 'Great quiz! I learned a lot from your questions.',
    time: '1 day ago',
    read: true,
    avatar: '/avatarPlaceholder.webp',
    avatarFallback: 'MC',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
]

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Close the more-menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return
    const handleClick = () => setOpenMenuId(null)
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [openMenuId])

  useEffect(() => {
    let cancelled = false
    async function fetchNotifications() {
      setIsLoading(true)
      setFetchError(false)
      try {
        const data = await getNotifications({ limit: 20 })
        if (!cancelled) {
          setNotifications(data.notifications)
        }
      } catch {
        if (!cancelled) {
          setFetchError(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchNotifications()
    return () => {
      cancelled = true
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )

    try {
      await markAsRead(id)
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      )
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    const previousNotifications = [...notifications]

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

    try {
      await markAllAsRead()
    } catch {
      setNotifications(previousNotifications)
    }
  }, [notifications])

  const handleDeleteNotification = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      const previousNotifications = [...notifications]

      setNotifications((prev) => prev.filter((n) => n.id !== id))

      try {
        await apiDeleteNotification(id)
      } catch {
        setNotifications(previousNotifications)
      }
    },
    [notifications]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className='relative'
          aria-label={`Notifications (${unreadCount} unread)`}
          type='button'
        >
          <div className='p-1.5 sm:p-2 border border-border rounded-md hover:bg-main-hover transition-colors'>
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
        <div className='flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border'>
          <DropdownMenuLabel className='p-0 text-sm sm:text-base font-semibold'>
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className='text-[0.65rem] sm:text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5 sm:gap-1'
            >
              <Check className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
              <span className='hidden xs:inline sm:inline'>Mark all read</span>
              <span className='inline xs:hidden sm:hidden'>Mark read</span>
            </button>
          )}
        </div>

        <ScrollArea className='h-[60vh] sm:h-100 max-h-125'>
          <DropdownMenuGroup>
            {isLoading ? (
              <div className='flex flex-col items-center justify-center h-[60vh] sm:h-100 max-h-125 text-muted-foreground'>
                <div className='w-8 h-8 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mb-2' />
                <p className='text-xs sm:text-sm'>Loading...</p>
              </div>
            ) : fetchError ? (
              <div className='flex flex-col items-center justify-center h-[60vh] sm:h-100 max-h-125 text-muted-foreground gap-2 px-4'>
                <BellOff className='h-8 w-8 sm:h-10 sm:w-10 opacity-50' />
                <p className='text-xs sm:text-sm'>Failed to load notifications</p>
                <p className='text-[0.65rem] sm:text-xs opacity-70'>Check your connection and try again</p>
              </div>
            ) : notifications.length === 0 ? (
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
                  onClick={() => handleMarkAsRead(notification.id)}
                >
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
                      {notification.createdAt
                        ? formatRelativeTime(notification.createdAt)
                        : notification.time}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(
                        openMenuId === notification.id ? null : notification.id
                      )
                    }}
                    className='shrink-0 p-0.5 sm:p-1 hover:bg-muted rounded-md transition-colors relative'
                    aria-label='More options'
                  >
                    <MoreHorizontal className='h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground' />
                    {openMenuId === notification.id && (
                      <div className='absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md py-1 w-28'>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNotification(notification.id, e)
                            setOpenMenuId(null)
                          }}
                          className='w-full flex items-center justify-between px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors cursor-pointer'
                        >
                          Delete
                          <Trash2 className='h-2.5 w-2.5' />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                          }}
                          className='w-full flex items-center justify-center px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer'
                        >
                          <X className='h-2.5 w-2.5' />
                        </button>
                      </div>
                    )}
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </ScrollArea>

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
