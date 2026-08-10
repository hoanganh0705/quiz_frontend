import type { MetadataRoute } from 'next'
import { siteConfig } from '@/shared/lib/seo'
import { quizzes } from '@/features/quizzes/constants/mock-quizzes'

const staticRoutes = [
  '/',
  '/bookmarks',
  '/categories',
  '/create-quiz',
  '/daily-challenge',
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

/**
 * `slugify` — preserved for the future server-side username
 * lookup endpoint (F-29 product decision). The Phase 1 rewrite
 * of `/profile/[name]/layout.tsx` removed the fake-profile SEO
 * entries; when the backend ships a username → userId endpoint,
 * the sitemap should call it server-side and emit one entry per
 * real profile.
 */
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
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8
  }))

  // Phase 1 removed the 11 fake-profile entries generated from
  // the hardcoded `players` constant (F-08, F-20b). The next
  // iteration should replace this with a server-side fetch
  // against the backend's username → userId endpoint when it
  // ships (F-29).

  return [...staticEntries, ...quizEntries]
}
