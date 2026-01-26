import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, Gift, Flame } from 'lucide-react'

interface BadgeItem {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  unlocked: boolean
}

interface StreakReward {
  id: string
  days: number
  reward: string
}

interface AchievementsTabProps {
  badges: BadgeItem[]
  unlockedBadges: number
  streakRewards: StreakReward[]
  currentStreak: number
}

export function AchievementsTab({
  badges,
  unlockedBadges,
  streakRewards,
  currentStreak
}: AchievementsTabProps) {
  return (
    <div className='mt-6'>
      <Card className='p-4'>
        <CardHeader>
          <CardTitle className='text-base flex items-center gap-2'>
            <Award className='w-4 h-4 text-purple-500' />
            All Badges ({unlockedBadges}/{badges.length} Unlocked)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
            {badges.map((badge) => {
              const IconComponent = badge.icon
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${badge.unlocked ? 'border-border' : 'border-border/50 opacity-50'} ${badge.bgColor}`}
                >
                  <IconComponent className={`w-8 h-8 ${badge.color}`} />
                  <span className={`text-sm font-medium ${badge.color}`}>
                    {badge.name}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {badge.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Streak Rewards */}
      <Card className='mt-4 p-4'>
        <CardHeader>
          <CardTitle className='text-base flex items-center gap-2'>
            <Gift className='w-4 h-4 text-amber-500' />
            Streak Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {streakRewards.map((reward) => (
              <div
                key={reward.id}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${currentStreak >= reward.days ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-muted/30'}`}
              >
                <Flame
                  className={`w-6 h-6 ${currentStreak >= reward.days ? 'text-amber-500' : 'text-muted-foreground'}`}
                />
                <span className='text-lg font-bold text-foreground'>
                  {reward.days} Days
                </span>
                <span className='text-xs text-muted-foreground text-center'>
                  {reward.reward}
                </span>
                {currentStreak >= reward.days && (
                  <Badge
                    variant='outline'
                    className='text-xs border-green-500/30 text-green-500'
                  >
                    Claimed
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
