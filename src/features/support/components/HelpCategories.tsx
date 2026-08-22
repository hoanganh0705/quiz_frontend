'use client'

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

interface HelpCategoriesProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export function HelpCategories({ activeCategory, onCategoryChange }: HelpCategoriesProps) {
  return (
    <div className='bg-transparent border border-border rounded-lg p-6'>
      <h3 className='text-xl font-semibold mb-6'>Help Categories</h3>
      <nav className='space-y-2' role='navigation' aria-label='Help categories'>
        {categories.map((category) => {
          const Icon = category.icon
          const isActive = activeCategory === category.id
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-default text-foreground font-medium'
                  : 'text-foreground hover:bg-default-hover hover:text-foreground'
              }`}
            >
              <Icon className='w-5 h-5' aria-hidden='true' />
              <span className='text-sm'>{category.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
