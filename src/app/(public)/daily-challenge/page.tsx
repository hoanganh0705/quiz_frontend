import { memo } from 'react'
import { DailyChallengeMainContent } from '@/features/daily-challenge'
import { getFeatureFlagValue } from '@/lib/feature-flags'

const flagValue = getFeatureFlagValue('dailyChallengePage')

const DailyChallenge = memo(function DailyChallenge() {
return (
<div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
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

{/* The InfoCard lives inside the live branch of `DailyChallengePage`
    so its data subscriptions and ticking countdown never run on the
    placeholder or skeleton branches. The route boundary remains the
    single read site for the feature flag (TKT-3.12.C2). */}
<DailyChallengeMainContent flagValue={flagValue} />
</div>
)
})

export default DailyChallenge