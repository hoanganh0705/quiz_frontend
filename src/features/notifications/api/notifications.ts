import { customInstance } from '@/lib/api'

export type NotificationType =
  | 'achievement'
  | 'message'
  | 'quiz'
  | 'challenge'
  | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  time: string
  read: boolean
  avatar?: string
  avatarFallback?: string
  createdAt: string
  data?: Record<string, unknown>
}

export interface GetNotificationsResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}

export interface GetNotificationsParams {
  page?: number
  limit?: number
  unreadOnly?: boolean
}

export interface MarkNotificationReadRequest {
  notificationId: string
}

export interface MarkNotificationReadResponse {
  success: boolean
}

export interface MarkAllNotificationsReadResponse {
  success: boolean
  markedCount: number
}

export interface DeleteNotificationResponse {
  success: boolean
}

// Phase 1: migrated from `@/shared/lib/api/client` to `@/lib/api`.
// The legacy `apiClient` (a parallel axios instance with no RFC 7807
// unwrapping, no cross-tab broadcast, no refresh-token dedup) was
// retired; `customInstance` now owns every notification request.
// See docs/frontend-cleanup-audit.md Phase 1.
export async function getNotifications(params?: GetNotificationsParams) {
  const response = await customInstance.request<{ data: GetNotificationsResponse }>({
    url: '/notifications',
    method: 'GET',
    params,
  })
  return response.data.data
}

export async function getUnreadCount() {
  const response = await customInstance.request<{ data: { unreadCount: number } }>({
    url: '/notifications/unread-count',
    method: 'GET',
  })
  return response.data.data
}

export async function markAsRead(notificationId: string) {
  const response = await customInstance.request<{ data: MarkNotificationReadResponse }>({
    url: `/notifications/${notificationId}/read`,
    method: 'POST',
  })
  return response.data.data
}

export async function markAllAsRead() {
  const response = await customInstance.request<{ data: MarkAllNotificationsReadResponse }>({
    url: '/notifications/read-all',
    method: 'POST',
  })
  return response.data.data
}

export async function deleteNotification(notificationId: string) {
  const response = await customInstance.request<{ data: DeleteNotificationResponse }>({
    url: `/notifications/${notificationId}`,
    method: 'DELETE',
  })
  return response.data.data
}