import { memo } from 'react'
import GlobalLeaderboard from '@/components/GlobalLeaderboard'

import { LeaderboardHighlights } from '@/components/leaderboard/leaderboard-highlights'
import { CompetitionStats, LeaderboardHeader } from '@/components/leaderboard'

const LeaderboardPage = memo(function LeaderboardPage() {
  return (
    <div className='min-h-screen p-4 md:p-8 lg:p-12'>
      <LeaderboardHeader />

      <section
        className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'
        aria-label='Leaderboard statistics'
      >
        <CompetitionStats />
        <LeaderboardHighlights />
      </section>

      <GlobalLeaderboard />
    </div>
  )
})

export default LeaderboardPage
