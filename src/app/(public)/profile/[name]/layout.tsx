import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
params
}: {
params: Promise<{ name: string }>
}): Promise<Metadata> {
const { name } = await params
const decodedName = decodeURIComponent(name)
const displayName = decodedName.charAt(0).toUpperCase() + decodedName.slice(1)

return buildMetadata({
title: `${displayName} | QuizHub Profile`,
description: `View ${displayName}'s achievements and quiz performance on QuizHub.`,
path: `/profile/${name}`
  })
}

export default async function ProfileLayout({
children,
params
}: {
children: ReactNode
params: Promise<{ name: string }>
}) {

await params

return <>{children}</>
}
