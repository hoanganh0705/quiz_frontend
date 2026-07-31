import type { ReactNode } from 'react'
import { buildMetadata } from '@/shared/lib/seo'
import { SettingsDeletionGuardWrapper } from '@/features/auth/components/settings-deletion-guard-wrapper'

export const metadata = buildMetadata({
  title: 'Settings | QuizHub',
  description: 'Manage your account preferences and privacy settings.',
  path: '/settings'
})

export default function SettingsLayout({ children }: { children: ReactNode }) {
  // T21: the deletion-terminal guard wraps the entire settings
  // surface so cached protected content cannot render after a
  // deletion commits. The wrapper itself is a no-op while the
  // marker is unset.
  return <SettingsDeletionGuardWrapper>{children}</SettingsDeletionGuardWrapper>
}
