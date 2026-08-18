

import { TagDetailPage } from '@/features/tags'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
params,
}: {
params: Promise<{ slug: string }>
}) {
const { slug } = await params
return buildMetadata({
title: 'Tag | QuizHub',
description: 'Browse quizzes tagged with this topic.',
path: `/tags/${slug}`,
  })
}

export default async function TagDetailRoute({
params,
}: {
params: Promise<{ slug: string }>
}) {
const { slug } = await params
return <TagDetailPage slug={slug} />
}
