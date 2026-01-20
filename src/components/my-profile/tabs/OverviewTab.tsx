import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Star, Clock, Award } from 'lucide-react'
import { Player } from '@/constants/players'

interface Activity {
  id: string
  icon: React.ReactNode
  title: string
  date: string
}

interface Badge {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  unlocked: boolean
}

interface OverviewTabProps {
  user: Player
  currentLevelXP: number
  nextLevelXP: number
  levelProgress: number
  recentActivities: Activity[]
  badges: Badge[]
  unlockedBadges: number
  onViewAllActivity: () => void
  onViewAllBadges: () => void
}

export function OverviewTab({
  user,
  currentLevelXP,
  nextLevelXP,
  levelProgress,
  recentActivities,
  badges,
  unlockedBadges,
  onViewAllActivity,
  onViewAllBadges
}: OverviewTabProps) {
  return (
    <div className='space-y-6 mt-6'>
      {/* Level Progress */}
      <Card className='bg-main p-4'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base flex items-center gap-2'>
            <Star className='w-4 h-4 text-amber-500' />
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Level {user.level}</span>
              <span className='text-muted-foreground'>
                {currentLevelXP.toLocaleString()} /{' '}
                {nextLevelXP.toLocaleString()} XP
              </span>
            </div>
            <Progress value={levelProgress} className='h-2' />
            <p className='text-xs text-muted-foreground'>
              {(nextLevelXP - currentLevelXP).toLocaleString()} XP to reach
              Level {(user.level || 0) + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className='bg-main p-4'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base flex items-center justify-between'>
            <span className='flex items-center gap-2'>
              <Clock className='w-4 h-4 text-default' />
              Recent Activity
            </span>
            <Button
              variant='ghost'
              size='sm'
              className='text-xs'
              onClick={onViewAllActivity}
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {recentActivities.slice(0, 3).map((activity) => (
            <div
              key={activity.id}
              className='flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors'
            >
              {activity.icon}
              <div className='flex-1 min-w-0'>
                <p className='text-sm text-foreground truncate'>
                  {activity.title}
                </p>
                <p className='text-xs text-muted-foreground'>{activity.date}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Badges Preview */}
      <Card className='bg-main p-4'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base flex items-center justify-between'>
            <span className='flex items-center gap-2'>
              <Award className='w-4 h-4 text-purple-500' />
              Badges ({unlockedBadges}/{badges.length})
            </span>
            <Button
              variant='ghost'
              size='sm'
              className='text-xs'
              onClick={onViewAllBadges}
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap gap-3'>
            {badges.slice(0, 5).map((badge) => {
              const IconComponent = badge.icon
              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-2 p-2 rounded-lg ${badge.bgColor} ${!badge.unlocked && 'opacity-50'}`}
                >
                  <IconComponent className={`w-4 h-4 ${badge.color}`} />
                  <span className={`text-xs font-medium ${badge.color}`}>
                    {badge.name}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
