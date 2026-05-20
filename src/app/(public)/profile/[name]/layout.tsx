import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { players } from '@/constants/players'
import { buildMetadata, siteConfig } from '@/lib/seo'

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')

export async function generateMetadata({
  params
}: {
  params: Promise<{ name: string }>
}): Promise<Metadata> {
  const { name } = await params
  const decodedName = decodeURIComponent(name)

  const profile = players.find(
    (player) => slugify(player.name) === slugify(decodedName)
  )

  if (!profile) {
    return buildMetadata({
      title: 'Profile | QuizHub',
      description: 'View player profiles and activity on QuizHub.',
      path: `/profile/${name}`
    })
  }

  return buildMetadata({
    title: `${profile.name} | QuizHub Profile`,
    description:
      profile.bio ||
      `View ${profile.name}'s achievements and quiz performance.`,
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
  const { name } = await params
  const decodedName = decodeURIComponent(name)

  const profile = players.find(
    (player) => slugify(player.name) === slugify(decodedName)
  )

  const personJsonLd = profile
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.name,
        description: profile.bio,
        image: profile.avatarUrl
          ? new URL(profile.avatarUrl, siteConfig.url).toString()
          : undefined,
        homeLocation: profile.country,
        url: new URL(`/profile/${name}`, siteConfig.url).toString()
      }
    : null

  return (
    <>
      {personJsonLd ? (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      ) : null}
      {children}
    </>
  )
}
