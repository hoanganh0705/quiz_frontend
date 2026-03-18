import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Settings | QuizHub',
  description: 'Manage your account preferences and privacy settings.',
  path: '/settings'
})

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children
}
