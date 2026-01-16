import GlobalLeaderboard from '@/components/GlobalLeaderBoard'
import { CompetitionStats } from '@/components/leaderboard/competition-stats'
import { LeaderboardHeader } from '@/components/leaderboard/leaderboard-header'
import { LeaderboardHighlights } from '@/components/leaderboard/leaderboard-highlights'

export default function Page() {
  return (
    <div className='min-h-screen p-4 md:p-8 lg:p-12'>
      <LeaderboardHeader />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'>
        <CompetitionStats />
        <LeaderboardHighlights />
      </div>

      <GlobalLeaderboard />
    </div>
  )
}
