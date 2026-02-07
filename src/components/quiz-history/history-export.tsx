'use client'

import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Download, FileJson, FileSpreadsheet, CheckCircle } from 'lucide-react'
import type { QuizHistoryEntry, ExportFormat } from '@/types/quizHistory'

interface HistoryExportProps {
  entries: QuizHistoryEntry[]
}

function entriesToCSV(entries: QuizHistoryEntry[]): string {
  const header = [
    'Quiz Title',
    'Category',
    'Difficulty',
    'Score (%)',
    'Correct Answers',
    'Total Questions',
    'Time (seconds)',
    'Status',
    'XP Earned',
    'Date',
    'Tags'
  ].join(',')

  const rows = entries.map((e) =>
    [
      `"${e.quizTitle}"`,
      `"${e.category}"`,
      e.difficulty,
      e.score,
      e.correctAnswers,
      e.totalQuestions,
      e.timeTaken,
      e.status,
      e.xpEarned,
      new Date(e.completedAt).toLocaleDateString(),
      `"${e.tags.join(', ')}"`
    ].join(',')
  )

  return [header, ...rows].join('\n')
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const HistoryExport = memo(function HistoryExport({
  entries
}: HistoryExportProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [exported, setExported] = useState(false)

  const handleExport = useCallback(() => {
    if (entries.length === 0) return

    const timestamp = new Date().toISOString().split('T')[0]

    if (format === 'csv') {
      const csv = entriesToCSV(entries)
      downloadFile(csv, `quiz-history-${timestamp}.csv`, 'text/csv')
    } else {
      const json = JSON.stringify(entries, null, 2)
      downloadFile(json, `quiz-history-${timestamp}.json`, 'application/json')
    }

    setExported(true)
    setTimeout(() => setExported(false), 2500)
  }, [entries, format])

  return (
    <div className='flex items-center gap-2'>
      <Select
        value={format}
        onValueChange={(v) => setFormat(v as ExportFormat)}
      >
        <SelectTrigger className='w-[120px] bg-background h-9'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='csv'>
            <span className='flex items-center gap-2'>
              <FileSpreadsheet className='h-3.5 w-3.5' />
              CSV
            </span>
          </SelectItem>
          <SelectItem value='json'>
            <span className='flex items-center gap-2'>
              <FileJson className='h-3.5 w-3.5' />
              JSON
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        size='sm'
        onClick={handleExport}
        disabled={entries.length === 0}
        className='gap-1.5'
      >
        {exported ? (
          <>
            <CheckCircle className='h-3.5 w-3.5' />
            Exported!
          </>
        ) : (
          <>
            <Download className='h-3.5 w-3.5' />
            Export ({entries.length})
          </>
        )}
      </Button>
    </div>
  )
})
