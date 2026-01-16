export interface Article {
  id: string
  category: string
  title: string
  description: string
  readTime: string
  icon: React.ComponentType<{ className?: string }>
  slug: string
  content?: string
  tags?: string[]
  lastUpdated?: string
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'
}
