import { customInstance } from '@/lib/api'

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

// Phase 1: migrated from `@/shared/lib/api/client` to `@/lib/api`.
// See docs/frontend-cleanup-audit.md Phase 1.
export async function getDiscussions(params?: GetDiscussionsParams) {
  const response = await customInstance.request<{ data: GetDiscussionsResponse }>({
    url: '/discussions',
    method: 'GET',
    params,
  })
  return response.data.data
}

export async function getDiscussion(discussionId: string) {
  const response = await customInstance.request<{ data: Discussion }>({
    url: `/discussions/${discussionId}`,
    method: 'GET',
  })
  return response.data.data
}

export async function createDiscussion(payload: CreateDiscussionRequest) {
  const response = await customInstance.request<{ data: CreateDiscussionResponse }>({
    url: '/discussions',
    method: 'POST',
    data: payload,
  })
  return response.data.data
}

export async function getDiscussionComments(
  discussionId: string,
  page = 1,
  limit = 20
) {
  const response = await customInstance.request<{ data: GetDiscussionCommentsResponse }>({
    url: `/discussions/${discussionId}/comments`,
    method: 'GET',
    params: { page, limit },
  })
  return response.data.data
}

export async function addComment(payload: AddCommentRequest) {
  const response = await customInstance.request<{ data: AddCommentResponse }>({
    url: `/discussions/${payload.discussionId}/comments`,
    method: 'POST',
    data: { content: payload.content },
  })
  return response.data.data
}

export async function getDiscussionCategories() {
  const response = await customInstance.request<{ data: string[] }>({
    url: '/discussions/categories',
    method: 'GET',
  })
  return response.data.data
}