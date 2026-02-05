'use client'

import { memo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
// Fix barrel imports (bundle-barrel-imports)
import { Select } from '@/components/ui/select'
import { SelectContent } from '@/components/ui/select'
import { SelectItem } from '@/components/ui/select'
import { SelectTrigger } from '@/components/ui/select'
import { SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const QuizDetailsTab = memo(function QuizDetailsTab() {
  return (
    <section
      className='p-6 space-y-8 border border-gray-300 dark:border-slate-700 rounded-xl'
      aria-labelledby='quiz-info-title'
    >
      <h2 id='quiz-info-title' className='text-2xl font-bold text-foreground'>
        Quiz Information
      </h2>

      <div className='space-y-4'>
        <div>
          <Label
            htmlFor='quiz-title'
            className='text-foreground text-sm mb-2 font-semibold'
          >
            Quiz Title
          </Label>
          <Input
            id='quiz-title'
            placeholder='Untitled Quiz'
            className='bg-transparent text-foreground placeholder:text-foreground/70 focus:ring-offset-0 focus:ring-0 border border-gray-300 dark:border-slate-700'
            autoComplete='off'
            required
          />
        </div>

        <div>
          <Label
            htmlFor='description'
            className='text-foreground text-sm mb-2 font-semibold'
          >
            Description
          </Label>
          <Textarea
            id='description'
            placeholder='Quiz description'
            className='bg-transparent text-foreground placeholder:text-foreground/70 min-h-25 resize-y focus:ring-offset-0 focus:ring-0 border border-gray-300 dark:border-slate-700'
            autoComplete='off'
          />
        </div>

        <div>
          <Label
            htmlFor='difficulty-level'
            className='text-foreground text-sm mb-2 block'
          >
            Difficulty Level
          </Label>
          <Select defaultValue='medium'>
            <SelectTrigger
              id='difficulty-level'
              className='w-full bg-white dark:bg-background text-foreground placeholder:text-foreground/70 focus:ring-offset-0 focus:ring-0 border border-gray-300 dark:border-slate-700'
            >
              <SelectValue placeholder='Select difficulty' />
            </SelectTrigger>
            <SelectContent className='bg-white dark:bg-background text-foreground'>
              <SelectItem value='easy'>Easy</SelectItem>
              <SelectItem value='medium'>Medium</SelectItem>
              <SelectItem value='hard'>Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor='tags' className='text-foreground text-sm mb-2 block'>
            Tags
          </Label>
          <div className='flex items-center gap-2'>
            <Input
              id='tags'
              placeholder='Add a tag'
              className='flex-1 bg-transparent text-foreground placeholder:text-foreground/70 focus:ring-offset-0 focus:ring-0 border border-gray-300 dark:border-slate-700'
              autoComplete='off'
            />
            <Button
              className='bg-transparent hover:bg-main-hover text-foreground px-6 py-2 rounded-md'
              aria-label='Add tag'
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
})

export default QuizDetailsTab
