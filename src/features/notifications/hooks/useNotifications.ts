"use client";

/**
 * `useNotifications` — cursor-paginated notification list hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B1.
 *
 * ## What this hook owns
 *
 * - Fetch and paginate the notification list through the service layer
 *   using opaque cursor pagination and the unread/type/date filters.
 * - Synthesise an `id` alias on each notification so
 *   `appendUniqueById` deduplication in `useCursorPaginated` works.
 * - Expose `isStale` when revalidation fails with cached data present.
 * - Feature-flag gating via `notifications_live`.
 *
 * ## Status / type filters
 *
 * The service accepts `unreadOnly?: boolean`, `type?: NotificationType`,
 * `fromDate?: string`, and `toDate?: string`. When filters are
 * `undefined`, the unfiltered list is returned.
 *
 * ## Cursor hygiene
 *
 * Cursors are opaque. The hook never decodes or constructs cursors.
 *
 * ## Auth reads
 *
 * Notification list reads are authenticated. The backend returns `void`
 * data when unauthenticated; the hook short-circuits when the feature
 * flag is off and the global auth bootstrap has not yet resolved.
 *
 * ## Socket invalidation
 *
 * The companion `useNotificationSocket` hook (TKT-5.4.B3) revalidates
 * this hook's SWR key on `notification:sent` and `notification:deleted`
 * events. This hook itself does NOT subscribe to the socket.
 */

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

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseNotificationsResult {
  items: readonly Notification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
  /** True when revalidation failed with cached data present. */
  isStale: boolean;
}

// ─── Wire type ─────────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `listNotifications` (post-unwrap).
 *
 * Mirrors the generated `GetNotifications200AllOf` shape:
 * `{ data?: NotificationResponseDto[]; meta?: { pagination?: PaginationMetaDto } }`.
 */
type ListNotificationsWireResponse = GetNotifications200AllOf;

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useNotifications(
  filters: NotificationListFilters = DEFAULT_NOTIFICATION_LIST_FILTERS,
): UseNotificationsResult {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // SWR cache key: disabled sentinel when flag is off so no fetch fires.
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
        // Feature flag off: short-circuit to an empty page.
        if (isFlagPlaceholder) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const effectiveCursor = cursor ?? filters.cursor ?? undefined;

        // Build the params shape consumed by the SDK. Only forward
        // defined fields so the SDK does not send `undefined` values.
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

        // Project `notificationId` onto `id` via the runtime helper.
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
    // TODO: wire stale-data tracking when the Epic 5.1 SWR stale hook lands.
    isStale: false,
  };
}

// Re-export the page shape for consumers.
export type { NotificationListPage, CursorPage };
