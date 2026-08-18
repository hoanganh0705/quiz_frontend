import { memo } from 'react'

import { Card } from '@/components/ui/Card'
import { CardContent } from '@/components/ui/Card'
import { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface StatsCardProps {
icon: LucideIcon
iconColor: string
iconBgColor: string
value: string | number
label: string

isLoading?: boolean
}

export const StatsCard = memo(function StatsCard({
icon: Icon,
iconColor,
iconBgColor,
value,
label,
isLoading = false
}: StatsCardProps) {
if (isLoading) {
return (
<Card>
<CardContent className='p-4'>
<div className='flex items-center gap-3'>
<Skeleton className={`w-10 h-10 rounded-lg`} />
<div className='space-y-2'>
<Skeleton className='h-6 w-16' />
<Skeleton className='h-3 w-20' />
</div>
</div>
</CardContent>
</Card>
    )
  }

return (
<Card>
<CardContent className='p-4'>
<div className='flex items-center gap-3'>
<div className={`p-2 rounded-lg ${iconBgColor}`} aria-hidden='true'>
<Icon className={`w-5 h-5 ${iconColor}`} />
</div>
<div>
<p className='text-xl font-bold text-foreground'>{value}</p>
<p className='text-xs text-muted-foreground'>{label}</p>
</div>
</div>
</CardContent>
</Card>
  )
})
