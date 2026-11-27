import * as Sentry from "@sentry/nextjs";

import { ApiError, customInstance, getNotifications, unwrapEnvelope } from "@/lib/api";

import type {
  GetNotificationAnalyticsResult,
  GetNotificationDetailResult,
  GetNotificationPreferencesResult,
  GetNotificationsResult,
  GetUnreadCountResult,
  UpdateNotificationPreferencesResult,
} from "@/lib/api/generated/notifications/notifications";
import type {
  GetNotificationsParams,
  UpdatePreferencesDto,
} from "@/lib/api/generated/schemas";

export async function listNotifications(
  params?: GetNotificationsParams,
): Promise<GetNotificationsResult["data"]> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.listNotifications",
  });
  const data = await getNotifications().getNotifications(params);
  if (!data || (data.data === undefined && data.meta === undefined)) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "List notifications response missing data envelope",
    });
  }
  return data as unknown as GetNotificationsResult["data"];
}

export async function getUnreadCount(): Promise<GetUnreadCountResult["data"]> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.getUnreadCount",
  });
  const response = await getNotifications().getUnreadCount();
  return unwrapEnvelope(
    response,
    "Unread count response missing data envelope",
  );
}

export async function getNotificationAnalytics(): Promise<
  GetNotificationAnalyticsResult["data"]
> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.getNotificationAnalytics",
  });
  const response = await getNotifications().getNotificationAnalytics();
  return unwrapEnvelope(
    response,
    "Notification analytics response missing data envelope",
  );
}

export async function getNotificationPreferences(): Promise<
  GetNotificationPreferencesResult["data"]
> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.getNotificationPreferences",
  });
  const response = await getNotifications().getNotificationPreferences();
  return unwrapEnvelope(
    response,
    "Notification preferences response missing data envelope",
  );
}

export async function getNotificationDetail(
  id: string,
): Promise<GetNotificationDetailResult["data"]> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: `notifications.getNotificationDetail(${id})`,
  });
  const response = await getNotifications().getNotificationDetail(id);
  return unwrapEnvelope(
    response,
    "Notification detail response missing data envelope",
  );
}

export async function updateNotificationPreferences(
  params: UpdatePreferencesDto,
): Promise<UpdateNotificationPreferencesResult["data"]> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.updateNotificationPreferences",
  });
  const response = await getNotifications().updateNotificationPreferences(params);
  return unwrapEnvelope(
    response,
    "Update notification preferences response missing data envelope",
  );
}

export async function deleteNotification(id: string): Promise<void> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: `notifications.deleteNotification(${id})`,
  });
  const _data =
    await getNotifications().notificationControllerDeleteNotification(id);
  void _data;
}

export async function markNotificationRead(id: string): Promise<void> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: `notifications.markNotificationRead(${id})`,
  });
  await getNotifications().notificationControllerMarkAsRead(id);
}

export async function markNotificationUnread(id: string): Promise<void> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: `notifications.markNotificationUnread(${id})`,
  });
  await getNotifications().notificationControllerMarkAsUnread(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.markAllNotificationsRead",
  });
  await getNotifications().notificationControllerMarkAllAsRead();
}

export async function deleteReadNotifications(): Promise<void> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.deleteReadNotifications",
  });
  await getNotifications().notificationControllerDeleteReadNotifications();
}

export async function deleteAllNotifications(): Promise<void> {
  Sentry.addBreadcrumb({
    category: "notifications:service",
    message: "notifications.deleteAllNotifications",
  });
  await customInstance.request<void>({
    url: "/api/v1/notifications",
    method: "DELETE",
  });
}
