export interface Category {
  id: string
  name: string
  description: string
  color: string
  textColor: string
  count: number
  slug: string
  popularity: number
  difficultyRange: [number, number]
  createdAt: string
  updatedAt: string
  isFeatured: boolean
  imageUrl: string
}
