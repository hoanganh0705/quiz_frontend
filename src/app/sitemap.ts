import type { MetadataRoute } from 'next'
import { siteConfig } from '@/shared/lib/seo'

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
 *
 * NOTE: Static quiz URLs removed from sitemap. Previously used
 * mock-quizzes.ts for quiz URLs, but this is stale data.
 * When the backend ships a quiz listing endpoint, uncomment and
 * fetch from: GET /api/v1/quizzes (with pagination).
 */
// const slugify = (value: string) =>
//   value
//     .trim()
//     .toLowerCase()
//     .replace(/[^a-z0-9\s-]/g, '')
//     .replace(/\s+/g, '-')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return staticRoutes.map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.7
  }))
}
