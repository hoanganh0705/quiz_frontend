import { CheckCircle2, Trophy, Zap } from 'lucide-react'

const achievementIcon = (
  <CheckCircle2 className='w-5 h-5 text-green-500' aria-hidden='true' />
)
const winIcon = <Trophy className='w-5 h-5 text-amber-500' aria-hidden='true' />
const participationIcon = (
  <Zap className='w-5 h-5 text-default' aria-hidden='true' />
)

/**
 * Returns the appropriate icon JSX element for a given activity type.
 * Shared between my-profile and public-profile hooks.
 */
export function getActivityIcon(type: string | undefined) {
  switch (type) {
    case 'achievement':
      return achievementIcon
    case 'win':
      return winIcon
    case 'participation':
      return participationIcon
    default:
      return participationIcon
  }
}
