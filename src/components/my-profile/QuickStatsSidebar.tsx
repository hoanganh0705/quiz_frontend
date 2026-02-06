import { memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import CategoryRow from '@/components/profile/CategoryRow'
import { Player } from '@/constants/players'

interface QuickStatsSidebarProps {
  user: Player
  bestCategory: string
  mostPlayed: string
}

export const QuickStatsSidebar = memo(function QuickStatsSidebar({
  user,
  bestCategory,
  mostPlayed
}: QuickStatsSidebarProps) {
  return (
    <Card className='sticky top-8'>
      <CardContent className='p-4'>
        <h2 className='text-base font-bold text-foreground mb-4'>
          Quick Stats
        </h2>

        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <span className='text-sm text-muted-foreground'>Total Score</span>
            <span className='text-sm font-bold text-foreground'>
              {user.score?.toLocaleString()}
            </span>
          </div>

          <div className='flex justify-between items-center'>
            <span className='text-sm text-muted-foreground'>Total Wins</span>
            <span className='text-sm font-bold text-foreground'>
              {user.wins}
            </span>
          </div>

          <div className='flex justify-between items-center'>
            <span className='text-sm text-muted-foreground'>Earned</span>
            <span className='text-sm font-bold text-green-500'>
              ${user.earned?.toFixed(2)}
            </span>
          </div>

          <div className='pt-4 border-t border-border space-y-3'>
            <CategoryRow label='Best Category' value={bestCategory} />
            <CategoryRow label='Most Played' value={mostPlayed} />
            <CategoryRow label='Global Rank' value={`#${user.rank}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
