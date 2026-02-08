'use client'

import { useState } from 'react'
import {
  HelpCircle,
  User,
  CreditCard,
  PlusCircle,
  Trophy,
  Shield,
  Settings
} from 'lucide-react'

const categories = [
  { id: 'all', label: 'All Categories', icon: HelpCircle },
  { id: 'account', label: 'Account', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'quiz-creation', label: 'Quiz Creation', icon: PlusCircle },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'technical', label: 'Technical Issues', icon: Settings },
  { id: 'general', label: 'General', icon: HelpCircle }
]

export function HelpCategories() {
  const [activeCategory, setActiveCategory] = useState('general')

  return (
    <div className='bg-transparent border border-gray-300 dark:border-slate-700 rounded-lg p-6'>
      <h3 className='text-xl font-semibold mb-6'>Help Categories</h3>
      <nav className='space-y-2'>
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors cursor-pointer ${
                activeCategory === category.id
                  ? 'bg-default text-white'
                  : 'text-foreground hover:bg-default-hover hover:text-white'
              }`}
            >
              <Icon className='w-5 h-5' />
              <span className='text-sm'>{category.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
