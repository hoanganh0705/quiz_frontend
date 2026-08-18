

import type {
GetNotificationAnalytics200,
GetNotificationDetail200,
GetNotificationPreferences200,
GetNotifications200,
GetNotificationsParams,
GetUnreadCount200,
UpdateNotificationPreferences200,
UpdatePreferencesDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getNotifications = () => {

const getNotifications = (
params?: GetNotificationsParams,
 ) => {
return orvalCustomInstance<GetNotifications200>(
{url: `/api/v1/notifications`, method: 'GET',
params
    },
      );
    }

const getUnreadCount = (

 ) => {
return orvalCustomInstance<GetUnreadCount200>(
{url: `/api/v1/notifications/unread-count`, method: 'GET'
    },
      );
    }

const getNotificationAnalytics = (

 ) => {
return orvalCustomInstance<GetNotificationAnalytics200>(
{url: `/api/v1/notifications/analytics`, method: 'GET'
    },
      );
    }

const getNotificationPreferences = (

 ) => {
return orvalCustomInstance<GetNotificationPreferences200>(
{url: `/api/v1/notifications/preferences`, method: 'GET'
    },
      );
    }

const updateNotificationPreferences = (
updatePreferencesDto: UpdatePreferencesDto,
 ) => {
return orvalCustomInstance<UpdateNotificationPreferences200>(
{url: `/api/v1/notifications/preferences`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updatePreferencesDto
    },
      );
    }

const getNotificationDetail = (
notificationId: string,
 ) => {
return orvalCustomInstance<GetNotificationDetail200>(
{url: `/api/v1/notifications/${notificationId}`, method: 'GET'
    },
      );
    }
const notificationControllerDeleteNotification = (
notificationId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/notifications/${notificationId}`, method: 'DELETE'
    },
      );
    }
const notificationControllerMarkAsRead = (
notificationId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/notifications/${notificationId}/read`, method: 'POST'
    },
      );
    }
const notificationControllerMarkAsUnread = (
notificationId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/notifications/${notificationId}/unread`, method: 'POST'
    },
      );
    }
const notificationControllerMarkAllAsRead = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/notifications/read-all`, method: 'POST'
    },
      );
    }
const notificationControllerDeleteReadNotifications = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/notifications/read-all`, method: 'DELETE'
    },
      );
    }
return {getNotifications,getUnreadCount,getNotificationAnalytics,getNotificationPreferences,updateNotificationPreferences,getNotificationDetail,notificationControllerDeleteNotification,notificationControllerMarkAsRead,notificationControllerMarkAsUnread,notificationControllerMarkAllAsRead,notificationControllerDeleteReadNotifications}};
export type GetNotificationsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['getNotifications']>>>
export type GetUnreadCountResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['getUnreadCount']>>>
export type GetNotificationAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['getNotificationAnalytics']>>>
export type GetNotificationPreferencesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['getNotificationPreferences']>>>
export type UpdateNotificationPreferencesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['updateNotificationPreferences']>>>
export type GetNotificationDetailResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['getNotificationDetail']>>>
export type NotificationControllerDeleteNotificationResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['notificationControllerDeleteNotification']>>>
export type NotificationControllerMarkAsReadResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['notificationControllerMarkAsRead']>>>
export type NotificationControllerMarkAsUnreadResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['notificationControllerMarkAsUnread']>>>
export type NotificationControllerMarkAllAsReadResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['notificationControllerMarkAllAsRead']>>>
export type NotificationControllerDeleteReadNotificationsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getNotifications>['notificationControllerDeleteReadNotifications']>>>
