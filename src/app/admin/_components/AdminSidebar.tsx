'use client'

import type * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Tag,
  BookOpen,
  Users,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator
} from '@/components/ui/Sidebar'

const adminNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Categories', url: '/admin/categories', icon: BookOpen },
  { title: 'Tags', url: '/admin/tags', icon: Tag },
  { title: 'Quizzes', url: '/admin/quizzes', icon: BookOpen },
  { title: 'Users', url: '/admin/users', icon: Users }
] as const

const bottomNavItems = [
  { title: 'Settings', url: '/admin/settings', icon: Settings },
  { title: 'Roles & Permissions', url: '/admin/roles', icon: Shield }
] as const

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === '/admin') return pathname === '/admin'
    return pathname.startsWith(url)
  }

  return (
    <Sidebar
      collapsible='icon'
      className='dark:bg-sidebar bg-sidebar'
      {...props}
    >
      <SidebarHeader className='border-r border-sidebar-border'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <Link href='/admin'>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-brand text-white-primary'>
                  <Shield className='size-4' />
                </div>
                <div className='flex flex-col gap-0.5 leading-none'>
                  <span className='font-bold text-base text-sidebar-foreground'>
                    Admin
                  </span>
                  <span className='text-xs text-muted-foreground font-normal'>
                    Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className='bg-background border border-sidebar-border'>
        <SidebarMenu className='space-y-1 px-2'>
          {adminNavItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className={`${
                  isActive(item.url)
                    ? 'text-white-primary bg-brand hover:bg-brand-hover data-[active=true]:bg-brand-hover'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                } transition-colors`}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span className='text-sm font-medium'>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator className='mx-2' />

      <SidebarFooter className='bg-background border-x border-sidebar-border'>
        <SidebarMenu className='space-y-1 px-2 pb-2'>
          {bottomNavItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className={`${
                  isActive(item.url)
                    ? 'text-white-primary bg-brand hover:bg-brand-hover data-[active=true]:bg-brand-hover'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                } transition-colors`}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span className='text-sm font-medium'>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarMenu className='px-2 pt-0'>
          <SidebarMenuItem>
            <SidebarMenuButton className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors'>
              <Link href='/' className='flex items-center gap-2'>
                <ChevronLeft className='size-4' />
                <span className='text-sm font-medium'>Back to App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
