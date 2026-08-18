"use client";

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
} from "@/lib/api/use-cursor-paginated.types";

import { listNotifications } from "@/features/notifications/services/notifications.service";
import {
NOTIFICATION_CACHE_KEYS,
DEFAULT_NOTIFICATION_LIST_FILTERS,
type Notification,
type NotificationListFilters,
type NotificationListPage,
} from "@/features/notifications/types/notification.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { GetNotifications200AllOf } from "@/lib/api/generated/schemas";

export interface UseNotificationsResult {
items: readonly Notification[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
refresh: () => Promise<void>;

isStale: boolean;
}

type ListNotificationsWireResponse = GetNotifications200AllOf;

const DEFAULT_LIMIT = 20;

export function useNotifications(
filters: NotificationListFilters = DEFAULT_NOTIFICATION_LIST_FILTERS,
): UseNotificationsResult {
const flagValue = getFeatureFlagValue("notifications_live");
const isFlagPlaceholder = flagValue === "placeholder";

const key = useMemo(
() =>
isFlagPlaceholder
? (["notifications", "list", "disabled"] as const)
: NOTIFICATION_CACHE_KEYS.list(filters),
[isFlagPlaceholder, filters],
  );

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<NotificationListFilters>): Promise<NotificationListPage> => {

if (isFlagPlaceholder) {
return {
items: [],
nextCursor: null,
hasNextPage: false,
limit: 0,
          };
        }

const effectiveCursor = cursor ?? filters.cursor ?? undefined;

const params: Parameters<typeof listNotifications>[0] = {};
if (effectiveCursor !== undefined) params.cursor = effectiveCursor;
if (typeof filters.limit === "number") params.limit = filters.limit;
if (filters.unreadOnly !== undefined) {
params.unreadOnly = filters.unreadOnly;
        }
if (filters.type !== undefined) params.type = filters.type;
if (filters.fromDate !== undefined) params.fromDate = filters.fromDate;
if (filters.toDate !== undefined) params.toDate = filters.toDate;

const wire = (await listNotifications(
params,
        )) as unknown as ListNotificationsWireResponse;

const items: Notification[] = projectWithId((wire.data ?? []) as unknown as readonly Record<string, unknown>[], 'notificationId') as unknown as Notification[];

const pagination = wire.meta?.pagination;
const limit =
pagination?.limit ?? filters.limit ?? DEFAULT_LIMIT;
return {
items,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit,
        };
      },
[isFlagPlaceholder, filters],
  );

const result = useCursorPaginated<Notification, NotificationListFilters>({
key,
fetcher,
params: filters,
paginationKind: "cursor",
  });

return {
items: result.items,
isLoading: result.isLoading,
isLoadingMore: result.isLoadingMore,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
refresh: result.refresh,

isStale: false,
  };
}

export type { NotificationListPage, CursorPage };
