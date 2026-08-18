'use client'

import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue
} from '@/components/ui/Select'
import { Download, FileJson, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { exportQuizHistory } from '@/features/quizzes/hooks/exportQuizHistory'
import type { ExportFormat } from '@/features/quizzes/types'

interface HistoryExportProps {

entriesCount: number
}

export const HistoryExport = memo(function HistoryExport({
entriesCount
}: HistoryExportProps): React.ReactElement {
const [format, setFormat] = useState<ExportFormat>('csv')
const [exported, setExported] = useState(false)
const [isExporting, setIsExporting] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleExport = useCallback(async () => {
setIsExporting(true)
setError(null)
try {
await exportQuizHistory({ format })
setExported(true)
setTimeout(() => setExported(false), 2500)
    } catch (err) {
setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
setIsExporting(false)
    }
  }, [format])

return (
<div className='flex items-center gap-2'>
<Select
value={format}
onValueChange={(v) => setFormat(v as ExportFormat)}
      >
<SelectTrigger className='w-30 bg-background h-9'>
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
disabled={isExporting || entriesCount === 0}
className='gap-1.5'
      >
{exported ? (
<>
<CheckCircle className='h-3.5 w-3.5' />
Exported!
          </>
        ) : error ? (
<>
<AlertCircle className='h-3.5 w-3.5' />
Try again
          </>
        ) : (
<>
<Download className='h-3.5 w-3.5' />
Export ({entriesCount})
          </>
        )}
</Button>
{error && (
<span className='text-xs text-destructive' role='alert'>
{error}
</span>
      )}
</div>
  )
})
