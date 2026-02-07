'use client'

import { memo } from 'react'
import { History, BarChart3 } from 'lucide-react'
import { HistoryExport } from './history-export'
import type { QuizHistoryEntry } from '@/types/quizHistory'

interface HistoryHeaderProps {
  totalEntries: number
  filteredEntries: QuizHistoryEntry[]
}

export const HistoryHeader = memo(function HistoryHeader({
  totalEntries,
  filteredEntries
}: HistoryHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
      <div>
        <h1 className='text-2xl md:text-3xl font-bold flex items-center gap-3'>
          <div className='p-2 rounded-xl bg-purple-500/10'>
            <History className='h-6 w-6 text-purple-500' />
          </div>
          Quiz History
        </h1>
        <p className='text-muted-foreground mt-1 flex items-center gap-2 text-sm'>
          <BarChart3 className='h-4 w-4' />
          Track your activity, analyze performance, and export your data
        </p>
        <p className='text-xs text-muted-foreground mt-0.5'>
          {totalEntries} total quizzes recorded
        </p>
      </div>

      <HistoryExport entries={filteredEntries} />
    </div>
  )
})
