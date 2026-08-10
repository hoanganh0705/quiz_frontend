import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildMetadata } from '@/shared/lib/seo'

/**
 * `/profile/[name]` layout — wraps the public profile page.
 *
 * Source epic:   Phase 1 (F-15) — public profile quick-wins.
 * Source ticket: F-15.
 *
 * The previous implementation imported the hardcoded `players`
 * constant from `features/leaderboard/constants/players` to
 * generate SEO metadata + JSON-LD for 11 fake profile slugs. F-15
 * removes that leak: there is no longer any fake-profile SEO copy.
 * The route renders the generic "Profile | QuizHub" metadata for
 * every slug, and JSON-LD is omitted entirely until the backend
 * exposes a username → userId lookup endpoint (Phase 5 / F-29).
 *
 * When the backend ships the lookup, the JSON-LD should be
 * reconstructed from the live `UserMeResponseDto` projection
 * (avatarUrl, bio, country, createdAt) — the previous hardcoded
 * shape is the documented seam.
 */
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
  // Phase 5 TODO: render JSON-LD when the backend exposes a
  // username → userId lookup endpoint. Until then, the profile
  // page renders without structured-data hints.
  await params

  return <>{children}</>
}
