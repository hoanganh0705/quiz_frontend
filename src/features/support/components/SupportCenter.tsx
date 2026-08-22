'use client'

import { useState } from 'react'
import { HelpCategories } from './HelpCategories'
import { FAQSection } from './FAQSection'
import { ContactForm } from './ContactForm'
import { KnowledgeBase } from './KnowledgeBase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

export function SupportCenter() {
  const [activeCategory, setActiveCategory] = useState('all')

  return (
    <div className='min-h-screen bg-transparent text-foreground mt-20'>
      {/* Header */}
      <div className='text-center px-4 mb-8'>
        <h1 className='text-3xl font-bold mb-4'>Support Center</h1>
        <p className='text-muted-foreground text-base max-w-2xl mx-auto'>
          Find answers to common questions or get in touch with our support team
        </p>
      </div>

      {/* Main Content */}
      <div className='px-4 pb-12'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          <div className='lg:col-span-1'>
            <HelpCategories
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>

          <div className='lg:col-span-3'>
            <Tabs defaultValue='faq' className='w-full'>
              <TabsList className='w-full justify-start overflow-x-auto bg-transparent border-b border-border mb-6 h-auto '>
                <TabsTrigger
                  value='faq'
                  className='py-2 px-1 mr-6 data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=inactive]:text-foreground-secondary'
                >
                  Frequently Asked Questions
                </TabsTrigger>
                <TabsTrigger
                  value='contact'
                  className='py-2 px-1 mr-6 data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=inactive]:text-foreground-secondary'
                >
                  Contact Support
                </TabsTrigger>
                <TabsTrigger
                  value='knowledge'
                  className='py-2 px-1 data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=inactive]:text-foreground-secondary'
                >
                  Knowledge Base
                </TabsTrigger>
              </TabsList>

              <TabsContent value='faq'>
                <FAQSection category={activeCategory} />
              </TabsContent>
              <TabsContent value='contact'>
                <ContactForm />
              </TabsContent>
              <TabsContent value='knowledge'>
                <KnowledgeBase category={activeCategory} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
