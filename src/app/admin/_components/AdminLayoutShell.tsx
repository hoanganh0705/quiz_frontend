'use client'

import type React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/Sidebar'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'

interface AdminLayoutShellProps {
  children: React.ReactNode
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <main className='pt-14 min-h-screen'>
          <div className='app-page-transition'>{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
