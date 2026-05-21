'use client'

import type * as React from 'react'
import {
  BookOpen,
  Home,
  Trophy,
  Grid3X3,
  Compass,
  UserPlus,
  Users,
  BarChart3,
  MessageSquare,
  Plus,
  LifeBuoy
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/Sidebar'
import { UserAvatarDropdown } from '@/shared/ui/UserAvatarDropdown'
import { useAuthState } from '@/features/auth/hooks/use-auth-state'
import { Button } from '@/components/ui/Button'

const sidebarItems = [
  {
    title: 'Home',
    url: '/',
    icon: Home
  },
  {
    title: "Today's Challenge",
    url: '/daily-challenge',
    icon: Trophy
  },
  {
    title: 'Categories',
    url: '/categories',
    icon: Grid3X3
  },
  {
    title: 'Explore Quizzes',
    url: '/quizzes',
    icon: Compass
  },
  {
    title: 'Friends',
    url: '/friends',
    icon: UserPlus
  },
  {
    title: 'Quiz Tournament',
    url: '/tournament',
    icon: Users
  },
  {
    title: 'Leaderboard',
    url: '/leaderboard',
    icon: BarChart3
  },
  {
    title: 'Quiz Discussions',
    url: '/discussions',
    icon: MessageSquare
  },
  {
    title: 'Create Quiz',
    url: '/create-quiz',
    icon: Plus
  },
  {
    title: 'Support',
    url: '/support',
    icon: LifeBuoy
  }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthState()

  return (
    <Sidebar
      collapsible='icon'
      className='dark:bg-background bg-background'
      {...props}
    >
      <SidebarHeader className=' border-x border-border pointer-events-none'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <Link href='/'>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-default'>
                  <BookOpen className='size-4' />
                </div>
                <div className='flex flex-col gap-0.5 leading-none'>
                  <span className='font-bold text-base text-foreground'>
                    QuizHub
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className=' bg-background border border-border'>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className='space-y-3'>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className={`${
                      pathname === item.url
                        ? 'text-white hover:bg-main-hover data-[active=true]:bg-default'
                        : 'text-foreground hover:bg-main-hover'
                    } text-sm flex items-center gap-2`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span className='text-sm font-medium'>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className='bg-background border-x border-border'>
        {isAuthenticated ? (
          <div className='px-2 pb-2'>
            <UserAvatarDropdown variant='sidebar' />
          </div>
        ) : (
          <div className='px-2 pb-2'>
            <Button asChild className='w-full bg-default hover:bg-default-hover text-white-primary'>
              <Link href='/login'>Sign in</Link>
            </Button>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
