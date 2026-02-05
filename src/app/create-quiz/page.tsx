'use client'

import { memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Tabs } from '@/components/ui/tabs'
import { TabsList } from '@/components/ui/tabs'
import { TabsTrigger } from '@/components/ui/tabs'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Eye, Trash2, Save, Upload } from 'lucide-react'
import QuizDetailsTab from '@/components/create-quiz/QuizDetailsTab'
import QuestionsTab from '@/components/create-quiz/QuestionsTab'
import SettingsTab from '@/components/create-quiz/SettingsTab'

const QuizForm = memo(function QuizForm() {
  return (
    <div className='min-h-screen w-full text-foreground p-4 md:p-6 bg-background'>
      <Tabs defaultValue='quiz-details' className='w-full'>
        {/* Header/Navigation Tabs */}
        <TabsList className='grid w-full grid-cols-3 bg-[#f5f5f5] dark:bg-main'>
          <TabsTrigger
            value='quiz-details'
            className='text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
          >
            Quiz Details
          </TabsTrigger>
          <TabsTrigger
            value='questions'
            className='text-sm font- dark:data-[state=active]:bg-default  dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
          >
            Questions
          </TabsTrigger>
          <TabsTrigger
            value='settings'
            className='text-sm font-light dark:data-[state=active]:bg-default  dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
          >
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Tabs Content */}
        <div className='mt-10 bg-white dark:bg-transparent'>
          {/* Quiz Details Tab Content */}
          <TabsContent value='quiz-details'>
            <QuizDetailsTab />
          </TabsContent>

          {/* Questions Tab Content */}
          <TabsContent value='questions'>
            <QuestionsTab />
          </TabsContent>

          {/* Settings Tab Content */}
          <TabsContent value='settings'>
            <SettingsTab />
          </TabsContent>
        </div>
      </Tabs>
      <hr className='my-6' />

      {/* Footer Action Buttons - Added proper accessibility */}
      <div
        className='flex flex-col sm:flex-row items-center justify-between p-6 bg-transparent gap-4 text-foreground'
        role='toolbar'
        aria-label='Quiz actions'
      >
        <div className='flex flex-wrap gap-3'>
          <Button
            className='bg-transparent dark:hover:bg-slate-800 hover:bg-main-hover border border-gray-300 dark:border-slate-700 text-foreground px-4 py-2 rounded-md'
            aria-label='Create new quiz'
          >
            <Plus className='w-4 h-4 mr-2' aria-hidden='true' />
            New Quiz
          </Button>
          <Button
            className='bg-transparent dark:hover:bg-slate-800 hover:bg-main-hover border border-gray-300 dark:border-slate-700 text-foreground px-4 py-2 rounded-md'
            aria-label='Preview quiz'
          >
            <Eye className='w-4 h-4 mr-2' aria-hidden='true' />
            Preview
          </Button>
        </div>
        <div className='flex flex-wrap gap-3'>
          <Button
            className='dark:bg-[#7F1D1D] bg-[#ef4444] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-md border border-gray-300 dark:border-slate-700'
            aria-label='Delete quiz'
          >
            <Trash2 className='w-4 h-4 mr-2' aria-hidden='true' />
            Delete Quiz
          </Button>
          <Button
            className='bg-transparent dark:hover:bg-slate-800 hover:bg-main-hover text-foreground px-4 py-2 rounded-md border border-gray-300 dark:border-slate-700'
            aria-label='Save draft'
          >
            <Save className='w-4 h-4 mr-2' aria-hidden='true' />
            Save Draft
          </Button>
          <Button
            className='bg-default hover:bg-default-hover text-white px-4 py-2 rounded-md border border-gray-300 dark:border-slate-700'
            aria-label='Publish quiz'
          >
            <Upload className='w-4 h-4 mr-2' aria-hidden='true' />
            Publish Quiz
          </Button>
        </div>
      </div>
    </div>
  )
})

export default QuizForm
