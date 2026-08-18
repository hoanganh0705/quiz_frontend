

import { CategoryDetailPage } from '@/features/categories'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
params,
}: {
params: Promise<{ idOrSlug: string }>
}) {
const { idOrSlug } = await params
return buildMetadata({
title: 'Category | QuizHub',
description: 'Browse quizzes in this category.',
path: `/categories/${idOrSlug}`,
  })
}

export default async function CategoryDetailRoute({
params,
}: {
params: Promise<{ idOrSlug: string }>
}) {
const { idOrSlug } = await params
return <CategoryDetailPage idOrSlug={idOrSlug} />
}
