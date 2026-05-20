// Quiz detail types - public API surface
export interface Review {
  id: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: string
}
