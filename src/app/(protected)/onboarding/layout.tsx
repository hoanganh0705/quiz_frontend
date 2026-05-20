import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Onboarding | QuizHub',
  description:
    'Set up your interests and profile to personalize your experience.',
  path: '/onboarding'
})

export default function OnboardingLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
