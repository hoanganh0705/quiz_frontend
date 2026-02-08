'use client'

import { useState } from 'react'
import { HelpCircle, MessageSquare, BookOpen } from 'lucide-react'

interface SupportTabsProps {
  onTabChange: (tab: string) => void
}

export function SupportTabs({ onTabChange }: SupportTabsProps) {
  const [activeTab, setActiveTab] = useState('faq')

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    onTabChange(tab)
  }

  return (
    <div className='border-b border-slate-700 mb-8'>
      <div className='px-4'>
        <div className='flex space-x-8'>
          <button
            onClick={() => handleTabChange('faq')}
            className={`cursor-pointer flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
              activeTab === 'faq'
                ? 'border-default text-foreground'
                : 'border-transparent text-foreground/70 hover:text-foreground'
            }`}
          >
            <HelpCircle className='w-5 h-5' />
            <span className='text-sm'>Frequently Asked Questions</span>
          </button>
          <button
            onClick={() => handleTabChange('contact')}
            className={`cursor-pointer flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
              activeTab === 'contact'
                ? 'border-default text-foreground'
                : 'border-transparent text-foreground/70 hover:text-foreground'
            }`}
          >
            <MessageSquare className='w-5 h-5' />
            <span className='text-sm'>Contact Support</span>
          </button>
          <button
            onClick={() => handleTabChange('knowledge')}
            className={`cursor-pointer flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
              activeTab === 'knowledge'
                ? 'border-default text-foreground'
                : 'border-transparent text-foreground/70 hover:text-foreground'
            }`}
          >
            <BookOpen className='w-5 h-5' />
            <span className='text-sm'>Knowledge Base</span>
          </button>
        </div>
      </div>
    </div>
  )
}
