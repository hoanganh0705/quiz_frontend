import type { ReactNode } from 'react'
import { buildMetadata } from '@/shared/lib/seo'
import { SettingsDeletionGuardWrapper } from '@/features/auth/components/settings-deletion-guard-wrapper'

export const metadata = buildMetadata({
title: 'Settings | QuizHub',
description: 'Manage your account preferences and privacy settings.',
path: '/settings'
})

export default function SettingsLayout({ children }: { children: ReactNode }) {

return <SettingsDeletionGuardWrapper>{children}</SettingsDeletionGuardWrapper>
}
