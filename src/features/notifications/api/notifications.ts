import { apiClient } from '@/shared/lib/api/client'

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

// Get notifications with pagination
export async function getNotifications(params?: GetNotificationsParams) {
  const response = await apiClient.get<GetNotificationsResponse>(
    '/notifications',
    { params }
  )
  return response.data
}

// Get unread count
export async function getUnreadCount() {
  const response = await apiClient.get<{ unreadCount: number }>(
    '/notifications/unread-count'
  )
  return response.data
}

// Mark a single notification as read
export async function markAsRead(notificationId: string) {
  const response = await apiClient.post<MarkNotificationReadResponse>(
    `/notifications/${notificationId}/read`
  )
  return response.data
}

// Mark all notifications as read
export async function markAllAsRead() {
  const response = await apiClient.post<MarkAllNotificationsReadResponse>(
    '/notifications/read-all'
  )
  return response.data
}

// Delete a notification
export async function deleteNotification(notificationId: string) {
  const response = await apiClient.delete<DeleteNotificationResponse>(
    `/notifications/${notificationId}`
  )
  return response.data
}
