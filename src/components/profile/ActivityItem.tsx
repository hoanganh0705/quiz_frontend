import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface ActivityItemProps {
  icon: React.ReactNode
  title: string
  date: string
}

const ActivityItem = ({ icon, title, date }: ActivityItemProps) => {
  return (
    <Card className='hover:border-default/50 transition-colors' role='listitem'>
      <CardContent className='flex gap-4 justify-center items-center p-4'>
        <div className='shrink-0'>{icon}</div>
        <div className='flex-1'>
          <p className='text-foreground font-medium'>{title}</p>
          <p className='text-muted-foreground text-sm'>
            <time dateTime={date}>{date}</time>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(ActivityItem)
