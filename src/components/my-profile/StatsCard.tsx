import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  icon: LucideIcon
  iconColor: string
  iconBgColor: string
  value: string | number
  label: string
}

export function StatsCard({
  icon: Icon,
  iconColor,
  iconBgColor,
  value,
  label
}: StatsCardProps) {
  return (
    <Card className='bg-main'>
      <CardContent className='p-4'>
        <div className='flex items-center gap-3'>
          <div className={`p-2 rounded-lg ${iconBgColor}`}>
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
}
