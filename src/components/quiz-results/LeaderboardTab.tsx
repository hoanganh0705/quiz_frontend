import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LeaderboardTabProps, LeaderboardItemProps } from '@/types/quizResults'
import { getRankStyle } from '@/lib/quizResultsUtils'

export default function LeaderboardTab({
  quiz,
  result,
  formatTime
}: LeaderboardTabProps) {
  return (
    <Card className='py-6'>
      <CardHeader>
        <CardTitle>Quiz Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {quiz.leaderBoard.slice(0, 10).map((player, index) => (
            <LeaderboardItem key={player.userId} player={player} rank={index} />
          ))}
        </div>

        {/* Your Position */}
        <div className='mt-6 p-4 bg-default/10 rounded-lg border border-default/30'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='w-8 h-8 rounded-full bg-default flex items-center justify-center font-bold text-xs text-white'>
                #{Math.floor(Math.random() * 50) + 1}
              </div>
              <div>
                <div className='font-medium'>Your Position</div>
                <div className='text-sm text-foreground/70'>
                  Completed just now
                </div>
              </div>
            </div>
            <div className='text-right'>
              <div className='font-bold text-default'>{result.score}%</div>
              <div className='text-sm text-foreground/70'>
                {formatTime(result.timeTaken)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LeaderboardItem({ player, rank }: LeaderboardItemProps) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg ${
        rank < 3
          ? 'bg-linear-to-r from-default/10 to-transparent'
          : 'bg-foreground/5'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getRankStyle(rank)}`}
      >
        {rank + 1}
      </div>
      <Avatar>
        <AvatarImage src={player.avatar || '/avatarPlaceholder.webp'} />
        <AvatarFallback>
          {player.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className='flex-1'>
        <div className='font-medium'>{player.username}</div>
        <div className='text-sm text-foreground/70'>
          Completed {player.completedAt}
        </div>
      </div>
      <div className='text-right'>
        <div className='font-bold '>{player.score}</div>
        <div className='text-sm text-foreground/70'>{player.time}</div>
      </div>
    </div>
  )
}
