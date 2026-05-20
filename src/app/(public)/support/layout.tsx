import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Support Center | QuizHub',
  description: 'Find help articles and support resources for QuizHub.',
  path: '/support'
})

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children
}
