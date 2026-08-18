import type { ReactNode } from 'react'
import { buildMetadata } from '@/shared/lib/seo'

export const metadata = buildMetadata({
title: 'Create Quiz | QuizHub',
description: 'Build and publish your own quizzes with a guided editor.',
path: '/create-quiz'
})

export default function CreateQuizLayout({
children
}: {
children: ReactNode
}) {
return children
}
