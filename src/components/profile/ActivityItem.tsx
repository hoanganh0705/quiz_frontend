import { Card, CardContent } from '@/components/ui/card'

interface ActivityItemProps {
  icon: React.ReactNode
  title: string
  date: string
}

export function ActivityItem({ icon, title, date }: ActivityItemProps) {
  return (
    <Card className='bg-main hover:border-default/50 transition-colors'>
      <CardContent className='pt-6 flex gap-4'>
        <div className='shrink-0'>{icon}</div>
        <div className='flex-1'>
          <p className='text-foreground font-medium'>{title}</p>
          <p className='text-muted-foreground text-sm'>{date}</p>
        </div>
      </CardContent>
    </Card>
  )
}
