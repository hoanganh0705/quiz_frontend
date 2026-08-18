'use client'

import { memo } from 'react'

import { DailyChallengePage } from './DailyChallengePage'

export interface DailyChallengeMainContentProps {

flagValue: 'v1' | 'placeholder'
}

const DailyChallengeMainContent = memo(function DailyChallengeMainContent({
flagValue,
}: DailyChallengeMainContentProps) {
return <DailyChallengePage flagValue={flagValue} />
})

export default DailyChallengeMainContent
