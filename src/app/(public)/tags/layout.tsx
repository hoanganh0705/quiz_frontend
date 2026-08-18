

import type { ReactNode } from 'react'

import { buildMetadata } from '@/shared/lib/seo'

export const metadata = buildMetadata({
title: 'Tags | QuizHub',
description: 'Browse tags to discover quizzes by topic.',
path: '/tags',
})

export default function TagsLayout({
children,
}: {
children: ReactNode
}) {
return children
}
