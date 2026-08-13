/**
 * `notifications.service.ts` — Notifications service.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F3.
 *
 * ## Pattern
 *
 * Thin SDK pass-throughs with Sentry breadcrumbs and `data` envelope
 * unwrapping. Follows the same discipline as `tournaments.service.ts`:
 *
 *   - Pure forwarders — no side-effects, no cache mutations.
 *   - `ApiError` is propagated unchanged so callers can read `apiError.code`.
 *   - One Sentry breadcrumb per call.
 *   - If the SDK response is missing `data` (malformed), throw a
 *     `GLOBAL_INTERNAL_ERROR`.
 *
 * ## REST vs SDK
 *
 * The existing `notifications.ts` file under `api/` uses a raw `apiClient`
 * (axios) wrapper. This service uses the orval-generated SDK instead,
 * providing typed responses with proper error handling.
 */

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

// ─── Reads ─────────────────────────────────────────────────────────────────

/**
 * `GET /api/v1/notifications`
 *
 * Returns a paginated list of notifications for the current user.
 *
 * Returns the raw SDK envelope (`{ data, meta }`) — callers read
 * `.data` / `.meta.pagination` directly. Unwrapping here (returning
 * `data.data`) breaks `useCursorPaginated`, which expects the wrapped
 * shape so it can read pagination metadata for subsequent pages.
 */
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

/**
 * `GET /api/v1/notifications/unread-count`
 */
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

/**
 * `GET /api/v1/notifications/analytics`
 */
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

/**
 * `GET /api/v1/notifications/preferences`
 */
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

/**
 * `GET /api/v1/notifications/:id`
 */
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

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * `PUT /api/v1/notifications/preferences`
 */
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

/**
 * `DELETE /api/v1/notifications/:id`
 */
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

/**
 * `POST /api/v1/notifications/:id/read`
 */
export async function markNotificationRead(
  id: string,
): Promise<void> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `notifications.markNotificationRead(${id})`,
  });
  await getNotifications().notificationControllerMarkAsRead(id);
}

/**
 * `POST /api/v1/notifications/:id/unread`
 */
export async function markNotificationUnread(
  id: string,
): Promise<void> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `notifications.markNotificationUnread(${id})`,
  });
  await getNotifications().notificationControllerMarkAsUnread(id);
}

/**
 * `POST /api/v1/notifications/read-all`
 */
export async function markAllNotificationsRead(): Promise<void> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "notifications.markAllNotificationsRead",
  });
  await getNotifications().notificationControllerMarkAllAsRead();
}

/**
 * `DELETE /api/v1/notifications/read`
 *
 * Deletes all read notifications.
 */
export async function deleteReadNotifications(): Promise<void> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "notifications.deleteReadNotifications",
  });
  await getNotifications().notificationControllerDeleteReadNotifications();
}
