import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QuizHub',
    short_name: 'QuizHub',
    description: 'Play quizzes, challenge friends, and track your progress.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/placeholder.webp',
        sizes: '192x192',
        type: 'image/webp'
      },
      {
        src: '/placeholder.webp',
        sizes: '512x512',
        type: 'image/webp'
      }
    ]
  }
}
