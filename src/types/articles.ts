export type ArticleIconName =
  | 'book-open'
  | 'user'
  | 'credit-card'
  | 'plus-circle'
  | 'trophy'
  | 'shield'
  | 'settings'

export interface Article {
  id: string
  category: string
  title: string
  description: string
  readTime: string
  icon: ArticleIconName
  slug: string
  content?: string
  tags?: string[]
  lastUpdated?: string
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'
}
