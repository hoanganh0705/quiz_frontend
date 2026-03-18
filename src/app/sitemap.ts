import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo'
import { quizzes } from '@/constants/mockQuizzes'
import { players } from '@/constants/players'

const staticRoutes = [
  '/',
  '/bookmarks',
  '/categories',
  '/create-quiz',
  '/daily-challenge',
  '/discussions',
  '/forgot-password',
  '/leaderboard',
  '/login',
  '/my-profile',
  '/onboarding',
  '/quiz-history',
  '/quizzes',
  '/settings',
  '/signup',
  '/support',
  '/tournament'
]

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticEntries = staticRoutes.map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.7
  }))

  const quizEntries = quizzes.map((quiz) => ({
    url: new URL(`/quizzes/${quiz.id}`, siteConfig.url).toString(),
    lastModified: new Date(quiz.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8
  }))

  const profileEntries = players.map((player) => ({
    url: new URL(`/profile/${slugify(player.name)}`, siteConfig.url).toString(),
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6
  }))

  return [...staticEntries, ...quizEntries, ...profileEntries]
}
