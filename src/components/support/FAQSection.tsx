'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

const faqs = [
  {
    id: 'what-is-quizhub',
    question: 'What is QuizHub ?',
    answer:
      'QuizHub is a comprehensive quiz platform that allows you to create, share, and participate in interactive quizzes and tournaments.'
  },
  {
    id: 'how-to-get-started',
    question: 'How do I get started?',
    answer:
      'Getting started is easy! Simply sign up for an account, verify your email, and you can immediately start creating quizzes or joining existing ones.'
  },
  {
    id: 'mobile-availability',
    question: 'Is QuizHub available on mobile devices?',
    answer:
      'Yes! QuizHub is fully responsive and works seamlessly on all mobile devices through your web browser. We also have dedicated mobile apps coming soon.'
  },
  {
    id: 'educational-use',
    question: 'Can I use QuizHub for educational purposes?',
    answer:
      'QuizHub is perfect for educational settings. Teachers can create quizzes for their students, track progress, and generate detailed reports.'
  },
  {
    id: 'contact-support',
    question: 'How do I contact customer support?',
    answer:
      'You can reach our support team through the Contact Support tab above, or email us directly at support@quizhub.com. We typically respond within 24 hours.'
  }
]

export function FAQSection() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className='bg-transparent border border-gray-300 dark:border-slate-700 rounded-lg p-8'>
      <div className='flex items-center justify-between mb-8 '>
        <h2 className='text-2xl font-bold'>General FAQs</h2>
        <div className='relative w-80'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/70 w-5 h-5' />
          <Input
            placeholder='Search FAQs...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10  text-foreground placeholder-foreground/70'
          />
        </div>
      </div>

      <Accordion type='single' collapsible className='space-y-4'>
        {filteredFaqs.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className='bg-transparent rounded-lg border border-gray-300 dark:border-slate-700'
          >
            <AccordionTrigger className='px-6 py-4 text-left hover:underline'>
              <span className='text-foreground font-medium'>
                {faq.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className='px-6 pb-4 text-foreground/70'>
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredFaqs.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-foreground/70'>
            No FAQs found matching your search.
          </p>
        </div>
      )}
    </div>
  )
}
