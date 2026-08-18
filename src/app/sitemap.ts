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

export default function sitemap(): MetadataRoute.Sitemap {
const now = new Date()

return staticRoutes.map((path) => ({
url: new URL(path, siteConfig.url).toString(),
lastModified: now,
changeFrequency: 'weekly' as const,
priority: path === '/' ? 1 : 0.7
  }))
}
