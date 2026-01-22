'use client'

import type * as React from 'react'
import {
  BookOpen,
  Home,
  Trophy,
  Grid3X3,
  Compass,
  Users,
  BarChart3,
  MessageSquare,
  Plus,
  LogOut,
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
} from '@/components/ui/sidebar'

// Navigation items
const items = [
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

  return (
    <Sidebar
      collapsible='icon'
      className='dark:bg-background bg-background'
      {...props}
    >
      <SidebarHeader className=' border-x border-gray-300 dark:border-slate-700 pointer-events-none'>
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
      <SidebarContent className=' bg-background border border-gray-300 dark:border-slate-700'>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className='space-y-3'>
              {items.map((item) => (
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
      <SidebarFooter className='bg-background border-x border-gray-300 dark:border-slate-700'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className='text-foreground cursor-pointer hover:bg-main-hover'>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
