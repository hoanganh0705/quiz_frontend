

import { vi } from 'vitest';

import type {
NotificationChannel,
NotificationType,
NotificationPriority,
NotificationListFilters,
NotificationListPage,
Notification,
NotificationPreferences,
UnreadCount,
NotificationMutationState,
NotificationErrorCode,
NotificationReadMutationResult,
MarkAllReadMutationResult,
DeleteNotificationMutationResult,
NOTIFICATION_CACHE_KEYS,
} from '@/features/notifications/types/notification.types';

export type _Refs = {
NotificationChannel: NotificationChannel;
NotificationType: NotificationType;
NotificationPriority: NotificationPriority;
NotificationListFilters: NotificationListFilters;
NotificationListPage: NotificationListPage;
Notification: Notification;
NotificationPreferences: NotificationPreferences;
UnreadCount: UnreadCount;
NotificationMutationState: NotificationMutationState;
NotificationErrorCode: NotificationErrorCode;
NotificationReadMutationResult: NotificationReadMutationResult;
MarkAllReadMutationResult: MarkAllReadMutationResult;
DeleteNotificationMutationResult: DeleteNotificationMutationResult;
NOTIFICATION_CACHE_KEYS: typeof NOTIFICATION_CACHE_KEYS;
};

export function makeNotification(
overrides: Partial<Notification> = {},
): Notification {
return {
notificationId: 'n1',
id: 'n1',
type: 'achievement' as never,
channel: 'in_app' as never,
isRead: false,
title: 'You earned a badge',
message: 'Badge unlocked: Quiz Master',
createdAt: '2026-01-01T00:00:00Z',
updatedAt: '2026-01-01T00:00:00Z',
...overrides,
  } as Notification;
}

export const FULL_PREFERENCES: NotificationPreferences = {
inAppEnabled: true,
emailEnabled: true,
pushEnabled: false,
achievementEnabled: true,
tournamentEnabled: true,
rankEnabled: true,
friendEnabled: true,
commentEnabled: true,
summaryEnabled: false,
marketingEnabled: false,
rankImprovementThreshold: 5,
};

export const notificationMocks = {
useNotifications: vi.fn(() => ({
items: [] as Notification[],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null as unknown,
refresh: vi.fn().mockResolvedValue(undefined),
isStale: false,
  })),
useUnreadNotificationCount: vi.fn(() => ({
unreadCount: 0,
isLoading: false,
error: null as unknown,
  })),
useNotificationSocket: vi.fn(() => ({
isLive: false,
connectionState: 'idle' as const,
socket: null,
error: null as unknown,
reconnect: vi.fn(),
disconnect: vi.fn(),
  })),
useMarkNotificationRead: vi.fn(() => ({
markRead: vi.fn().mockResolvedValue(undefined),
state: 'idle' as const,
error: null as unknown,
reset: vi.fn(),
  })),
useMarkNotificationUnread: vi.fn(() => ({
markUnread: vi.fn().mockResolvedValue(undefined),
state: 'idle' as const,
error: null as unknown,
reset: vi.fn(),
  })),
useDeleteNotification: vi.fn(() => ({
deleteNotification: vi.fn().mockResolvedValue(undefined),
state: 'idle' as const,
error: null as unknown,
reset: vi.fn(),
  })),
useNotificationPreferences: vi.fn(() => ({
preferences: FULL_PREFERENCES,
isLoading: false,
error: null as unknown,
isUpdating: false,
isUpdated: false,
updateError: null as unknown,
update: vi.fn().mockResolvedValue(undefined),
reset: vi.fn(),
  })),
useNotificationFeatureFlag: vi.fn(() => ({
isPlaceholder: false,
flagValue: 'live' as const,
  })),
};

export function installNotificationMocks() {
return {
useNotifications: notificationMocks.useNotifications,
useUnreadNotificationCount: notificationMocks.useUnreadNotificationCount,
useNotificationSocket: notificationMocks.useNotificationSocket,
useMarkNotificationRead: notificationMocks.useMarkNotificationRead,
useMarkNotificationUnread: notificationMocks.useMarkNotificationUnread,
useDeleteNotification: notificationMocks.useDeleteNotification,
useNotificationPreferences: notificationMocks.useNotificationPreferences,
useNotificationFeatureFlag: notificationMocks.useNotificationFeatureFlag,
  };
}
