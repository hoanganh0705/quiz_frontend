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

export async function getNotifications(params?: GetNotificationsParams) {
const response = await customInstance.request<{ data: GetNotificationsResponse }>({
url: '/api/v1/notifications',
method: 'GET',
params,
  })
return response.data.data
}

export async function getUnreadCount() {
const response = await customInstance.request<{ data: { count: number } }>({
url: '/api/v1/notifications/unread-count',
method: 'GET',
  })
return response.data.data
}

export async function markAsRead(notificationId: string) {
const response = await customInstance.request<{ data: MarkNotificationReadResponse }>({
url: `/api/v1/notifications/${notificationId}/read`,
method: 'POST',
  })
return response.data.data
}

export async function markAllAsRead() {
const response = await customInstance.request<{ data: MarkAllNotificationsReadResponse }>({
url: '/api/v1/notifications/read-all',
method: 'POST',
  })
return response.data.data
}

export async function deleteNotification(notificationId: string) {
const response = await customInstance.request<{ data: DeleteNotificationResponse }>({
url: `/api/v1/notifications/${notificationId}`,
method: 'DELETE',
  })
return response.data.data
}