import type { Metadata } from 'next'

const DEFAULT_SITE_URL = 'https://quizhub.example.com'

export const siteConfig = {
  name: 'QuizHub',
  description:
    'Play quizzes, challenge friends, and improve your knowledge every day.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL
}

interface BuildMetadataInput {
  title: string
  description: string
  path?: string
}

export function buildMetadata({
  title,
  description,
  path = '/'
}: BuildMetadataInput): Metadata {
  const url = new URL(path, siteConfig.url).toString()

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  }
}
