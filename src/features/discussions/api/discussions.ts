import { apiClient } from '@/shared/lib/api/client'

export type DiscussionDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface DiscussionUser {
  username: string
  avatarSrc?: string
  avatarFallback: string
}

export interface Discussion {
  id: string
  title: string
  category: string
  difficulty: DiscussionDifficulty
  lastActivity: string
  user: DiscussionUser
  comments: number
  correct: number
  incorrect: number
  percentage: number
  quizId?: string
  createdAt: string
}

export interface GetDiscussionsResponse {
  discussions: Discussion[]
  total: number
}

export interface GetDiscussionsParams {
  category?: string
  difficulty?: DiscussionDifficulty
  sortBy?: 'recent' | 'popular'
  page?: number
  limit?: number
}

export interface CreateDiscussionRequest {
  title: string
  category: string
  difficulty: DiscussionDifficulty
  quizId?: string
  content: string
}

export interface CreateDiscussionResponse {
  discussion: Discussion
  message: string
}

export interface DiscussionComment {
  id: string
  discussionId: string
  userId: string
  username: string
  avatarSrc?: string
  avatarFallback: string
  content: string
  createdAt: string
  updatedAt: string
  likes: number
  isLiked: boolean
}

export interface GetDiscussionCommentsResponse {
  comments: DiscussionComment[]
  total: number
  hasMore: boolean
}

export interface AddCommentRequest {
  discussionId: string
  content: string
}

export interface AddCommentResponse {
  comment: DiscussionComment
  message: string
}

// Get discussions
export async function getDiscussions(params?: GetDiscussionsParams) {
  const response = await apiClient.get<GetDiscussionsResponse>('/discussions', {
    params
  })
  return response.data
}

// Get discussion by ID
export async function getDiscussion(discussionId: string) {
  const response = await apiClient.get<Discussion>(`/discussions/${discussionId}`)
  return response.data
}

// Create a new discussion
export async function createDiscussion(payload: CreateDiscussionRequest) {
  const response = await apiClient.post<CreateDiscussionResponse>(
    '/discussions',
    payload
  )
  return response.data
}

// Get discussion comments
export async function getDiscussionComments(
  discussionId: string,
  page = 1,
  limit = 20
) {
  const response = await apiClient.get<GetDiscussionCommentsResponse>(
    `/discussions/${discussionId}/comments`,
    {
      params: { page, limit }
    }
  )
  return response.data
}

// Add a comment to a discussion
export async function addComment(payload: AddCommentRequest) {
  const response = await apiClient.post<AddCommentResponse>(
    `/discussions/${payload.discussionId}/comments`,
    { content: payload.content }
  )
  return response.data
}

// Get discussion categories
export async function getDiscussionCategories() {
  const response = await apiClient.get<string[]>('/discussions/categories')
  return response.data
}
