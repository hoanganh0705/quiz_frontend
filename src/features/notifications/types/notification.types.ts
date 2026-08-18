

import type {
NotificationResponseDto,
NotificationResponseDtoChannel,
NotificationResponseDtoType,
NotificationPreferencesResponseDto,
UnreadCountResponseDto,
} from "@/lib/api/generated/schemas";

export type NotificationChannel = NotificationResponseDtoChannel;

export type NotificationType = NotificationResponseDtoType;

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationListFilters {

unreadOnly?: boolean;

type?: NotificationType;

fromDate?: string;

toDate?: string;

cursor?: string;

limit?: number;
}

export const DEFAULT_NOTIFICATION_LIST_FILTERS: NotificationListFilters = {
unreadOnly: undefined,
type: undefined,
fromDate: undefined,
toDate: undefined,
cursor: undefined,
limit: undefined,
};

export interface NotificationListPage {
items: readonly Notification[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
}

export type Notification = NotificationResponseDto & {

id: string;

priority?: NotificationPriority;
};

export type NotificationPreferences = NotificationPreferencesResponseDto;

export type UnreadCount = UnreadCountResponseDto;

export interface NotificationReadMutationResult {
notificationId: string;
unreadCount: number;
readAt: string;
}

export interface MarkAllReadMutationResult {
markedCount: number;
unreadCount: number;
}

export interface DeleteNotificationMutationResult {
notificationId: string;

previousUnreadCount: number;

unreadCount: number;
}

export type NotificationMutationState =
| "idle"
  | "pending"
  | "success"
  | "error";

export type NotificationErrorCode =
| "NOTIFICATION_NOT_FOUND"
  | "NOTIFICATION_FORBIDDEN"
  | "NOTIFICATION_DELETION_FORBIDDEN"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INVALID_PREFERENCE_VALUE"
  | "GLOBAL_VALIDATION_FAILED"
  | "GLOBAL_INTERNAL_ERROR";

export function serializeNotificationFilters(
filters: NotificationListFilters,
): string {
const parts: string[] = [];

if (filters.unreadOnly !== undefined) {
parts.push(`unread=${filters.unreadOnly ? "1" : "0"}`);
  }
if (filters.type !== undefined) {
parts.push(`type=${filters.type}`);
  }
if (filters.fromDate !== undefined && filters.fromDate.length > 0) {
parts.push(`from=${filters.fromDate}`);
  }
if (filters.toDate !== undefined && filters.toDate.length > 0) {
parts.push(`to=${filters.toDate}`);
  }
if (filters.cursor !== undefined) {
parts.push(`cursor=${filters.cursor}`);
  }
if (typeof filters.limit === "number") {
parts.push(`limit=${filters.limit}`);
  }

return parts.join("|");
}

export const NOTIFICATION_CACHE_KEYS = {

list(filters: NotificationListFilters) {
return [
"notifications",
"list",
serializeNotificationFilters(filters),
    ] as const;
  },

detail(notificationId: string) {
return ["notifications", "detail", notificationId] as const;
  },

preferences() {
return ["notifications", "preferences"] as const;
  },

unreadCount() {
return ["notifications", "unread-count"] as const;
  },

invalidateAfterMutation() {
return {
list: (
filters: NotificationListFilters = DEFAULT_NOTIFICATION_LIST_FILTERS,
      ) => this.list(filters),
detail: (notificationId: string) => this.detail(notificationId),
unreadCount: () => this.unreadCount(),
    } as const;
  },
} as const;
