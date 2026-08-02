import { memo } from 'react'
import {
  InfoCard,
  DailyChallengeMainContent,
} from '@/features/daily-challenge'
import { getFeatureFlagValue } from '@/lib/feature-flags'

/**
 * Page-level read site for the `dailyChallengePage` feature flag
 * (TKT-3.12.A2 / TKT-3.12.D2).
 *
 * The flag is read synchronously at module-evaluation time (the
 * `feature-flags.ts` A2 implementation already reads the
 * `NEXT_PUBLIC_DAILY_CHALLENGE_PAGE` env-var override at module
 * init). The page is a server component by default, so the read
 * happens at SSR time and is forwarded to the client-rendered
 * `<DailyChallengeMainContent />` as a prop.
 *
 * The flag does NOT change at runtime in this commit; the page
 * boundary is the only read site, and a future flag-flip requires a
 * rebuild + redeploy (mirrors the `next.config.ts`-time env-var
 * convention used elsewhere in the codebase).
 */
const flagValue = getFeatureFlagValue('dailyChallengePage')

const DailyChallenge = memo(function DailyChallenge() {
  return (
    <div className='min-h-screen text-white p-4 md:p-8 lg:p-12'>
      {/* Header — preserved from the pre-Epic-3.12 page. The header is
          not gated on the flag (AC #4): the user lands on the same
          page in either mode. */}
      <header className='space-y-2' role='banner'>
        <h1 className='text-2xl text-foreground md:text-3xl font-bold'>
          Daily Challenge
        </h1>
        <p className='text-foreground/80'>
          Test your knowledge and compete with others!
        </p>
      </header>

      {/* Info Cards — preserved from the pre-Epic-3.12 page. The
          InfoCard's outer dimensions match the route-level skeleton's
          skeleton counterpart in `loading.tsx` (TKT-3.12.D1) so the
          skeleton-to-live swap is CLS-zero. */}
      <InfoCard />

      {/* Main Content — the live `<DailyChallengePage />` composition
          (TKT-3.12.C1) is reached through the thin delegation in
          `DailyChallengeMainContent` (TKT-3.12.C2). The flag value is
          forwarded as a prop so the route boundary is the single read
          site. */}
      <DailyChallengeMainContent flagValue={flagValue} />
    </div>
  )
})

export default DailyChallenge
