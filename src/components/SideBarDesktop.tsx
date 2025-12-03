'use client'

import React from 'react'
import { LogOut } from 'lucide-react'
import { sidebarItems } from '@/constants/sideBarItems'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SideBarProps {
  isCollapsed: boolean
}

const SideBarDesktop = ({ isCollapsed }: SideBarProps) => {
  const pathname = usePathname()

  return (
    <aside
      className={`fixed top-20 h-[calc(100%-4rem)] left-0 z-10 ${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-main border-r border-slate-700 flex flex-col justify-between transition-all duration-300`}
    >
      <div className='flex-1'>
        {/* Navigation */}
        <nav className='mt-10 p-2 space-y-3'>
          {sidebarItems.map((item, index) => (
            <Link
              href={item.href}
              key={index}
              className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                pathname === item.href
                  ? 'bg-default text-primary'
                  : 'text-white-primary hover:bg-slate-700 hover:text-white'
              }`}
            >
              <item.icon className='h-5 w-5' />
              {!isCollapsed && (
                <span className='ml-3 text-sm font-medium'>{item.label}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div className='p-2'>
        <button className='flex items-center w-full px-3 py-2 rounded-lg cursor-pointer border-t transform -translate-y-5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors'>
          <LogOut className='h-5 w-5' />
          {!isCollapsed && (
            <span className='ml-3 text-sm font-medium'>Logout</span>
          )}
        </button>
      </div>
    </aside>
  )
}

export default SideBarDesktop
