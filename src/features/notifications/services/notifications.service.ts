

import * as Sentry from "@sentry/nextjs";

import { getNotifications } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import type {
UpdatePreferencesDto,
} from "@/lib/api/generated/schemas";

import type {
GetNotificationsResult,
GetUnreadCountResult,
GetNotificationAnalyticsResult,
GetNotificationPreferencesResult,
UpdateNotificationPreferencesResult,
GetNotificationDetailResult,
NotificationControllerDeleteNotificationResult,
NotificationControllerMarkAsReadResult,
NotificationControllerMarkAsUnreadResult,
NotificationControllerMarkAllAsReadResult,
NotificationControllerDeleteReadNotificationsResult,
} from "@/lib/api/generated/notifications/notifications";

import type {
GetNotificationsParams,
} from "@/lib/api/generated/schemas";

export async function listNotifications(
params?: GetNotificationsParams,
): Promise<GetNotificationsResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "notifications.listNotifications",
  });
const data = await getNotifications().getNotifications(params);
if (!data || (data.data === undefined && data.meta === undefined)) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "List notifications response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data;
}

export async function getUnreadCount(): Promise<
GetUnreadCountResult["data"]
> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "notifications.getUnreadCount",
  });
const data = await getNotifications().getUnreadCount();
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Unread count response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getNotificationAnalytics(): Promise<
GetNotificationAnalyticsResult["data"]
> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "notifications.getNotificationAnalytics",
  });
const data = await getNotifications().getNotificationAnalytics();
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Notification analytics response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getNotificationPreferences(): Promise<
GetNotificationPreferencesResult["data"]
> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "notifications.getNotificationPreferences",
  });
const data = await getNotifications().getNotificationPreferences();
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Notification preferences response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getNotificationDetail(
id: string,
): Promise<GetNotificationDetailResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `notifications.getNotificationDetail(${id})`,
  });
const data = await getNotifications().getNotificationDetail(id);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Notification detail response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function updateNotificationPreferences(
params: UpdatePreferencesDto,
): Promise<UpdateNotificationPreferencesResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "notifications.updateNotificationPreferences",
  });
const data = await getNotifications().updateNotificationPreferences(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Update notification preferences response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function deleteNotification(
id: string,
): Promise<void> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `notifications.deleteNotification(${id})`,
  });
const _data = await getNotifications().notificationControllerDeleteNotification(id);
void _data;
}

export async function markNotificationRead(
id: string,
): Promise<void> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `notifications.markNotificationRead(${id})`,
  });
await getNotifications().notificationControllerMarkAsRead(id);
}

export async function markNotificationUnread(
id: string,
): Promise<void> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `notifications.markNotificationUnread(${id})`,
  });
await getNotifications().notificationControllerMarkAsUnread(id);
}

export async function markAllNotificationsRead(): Promise<void> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "notifications.markAllNotificationsRead",
  });
await getNotifications().notificationControllerMarkAllAsRead();
}

export async function deleteReadNotifications(): Promise<void> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "notifications.deleteReadNotifications",
  });
await getNotifications().notificationControllerDeleteReadNotifications();
}
