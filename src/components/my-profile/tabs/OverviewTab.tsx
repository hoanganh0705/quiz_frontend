import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
      <Card className='p-4'>
        <CardHeader className=''>
          <CardTitle className='text-base flex items-center'>
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
      <Card className='p-4'>
        <CardHeader className=''>
          <CardTitle className='text-base flex items-center justify-between'>
            <span className='flex items-center gap-2'>Recent Activity</span>
            <Button
              size='sm'
              className='text-xs text-white'
              onClick={onViewAllActivity}
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {recentActivities.slice(0, 3).map((activity) => (
            <div
              key={activity.id}
              className='flex items-center gap-3 rounded-lg transition-colors hover:bg-default/10 border p-3 border-default/20'
            >
              {activity.icon}
              <div className='flex-1 min-w-0 '>
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
      <Card className='p-4'>
        <CardHeader className=''>
          <CardTitle className='text-base flex items-center justify-between'>
            <span className='flex items-center gap-2'>
              Badges ({unlockedBadges}/{badges.length})
            </span>
            <Button
              size='sm'
              className='text-xs text-white'
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
