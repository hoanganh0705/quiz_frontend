import type React from 'react'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight } from 'lucide-react'
import { articles } from '@/constants/articles'

export function KnowledgeBase() {
  return (
    <div className='space-y-6 bg-transparent border border-gray-300 dark:border-slate-700 rounded-lg  p-8'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-foreground'>
          All Categories Knowledge Base
        </h2>
        <div className='relative w-80'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/70 h-4 w-4' />
          <Input
            placeholder='Search articles...'
            className='pl-10 bg-transparent border border-gray-300 dark:border-slate-700 text-foreground placeholder:text-foreground/70'
          />
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {articles.map((article) => {
          const IconComponent = article.icon
          return (
            <div
              key={article.id}
              className='group p-6 dark:hover:bg-default-hover group-hover:border-default transition-colors cursor-pointer border border-gray-300 dark:border-slate-700 rounded-lg hover:border-default-hover'
            >
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                  <IconComponent className='h-4 w-4 text-foreground' />
                  <span className='text-xs text-foreground px-1 py-0.5 cursor-pointer border border-gray-300 dark:border-slate-700 rounded-md'>
                    {article.category}
                  </span>
                </div>
                <span className='text-sm text-foreground/70'>
                  {article.readTime}
                </span>
              </div>
              <h3 className='text-lg font-semibold text-foreground mb-2'>
                {article.title}
              </h3>
              <p className='text-foreground/70 text-sm mb-4'>
                {article.description}
              </p>
              <div className='flex items-center text-foreground group-hover:text-default-hover dark:group-hover:text-foreground transition-colors'>
                <span className='text-sm font-medium'>Read article</span>
                <ArrowRight className='h-4 w-4 ml-1' />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
