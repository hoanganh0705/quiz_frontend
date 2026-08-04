/**
 * `notification.types.ts` — Story 5.4 notification types and cache key factories.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.A1.
 *
 * ## Purpose
 *
 * Single source of truth for the notification domain types, filter shapes,
 * cursor-pagination result shapes, mutation result shapes, error codes, and
 * SWR cache-key factories consumed by every Story 5.4 hook and component.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Story 5.1 (`notifications.service.ts`). Types extend the
 * generated SDK DTOs to add `id` aliases for SWR deduplication, not to
 * redefine fields verbatim. The `Notification` type is the canonical
 * `NotificationResponseDto` projection used by the bell, the popover, and
 * the center page.
 *
 * ## Pagination kind
 *
 * Notifications use cursor pagination (`PaginationMetaDto`, `kind: 'cursor'`).
 * The backend returns a `cursor` opaque string in `pagination.nextCursor`.
 *
 * ## Cursor hygiene
 *
 * Cursor fields are treated as opaque. Components never decode or
 * construct cursors.
 *
 * ## Server authority
 *
 * The unread count is server-authoritative. Components never compute it
 * client-side. The count is sourced from the
 * `GET /api/v1/notifications/unread-count` endpoint (`unreadCount` field)
 * and is decremented only by the server response after a successful
 * mark-read / delete mutation. The count is never decremented below zero.
 *
 * ## Socket event payload
 *
 * The `notification.sent` event payload mirrors the `NotificationResponseDto`
 * fields needed to render the row in the bell/popover without a round-trip.
 * Components build the row from the event payload and let SWR revalidate
 * the list cache to reconcile server-authoritative state.
 *
 * ## SWR cache key factories
 *
 * Each factory returns a frozen tuple so equal inputs produce equal keys.
 * The factories are pure (no clock, no random) so they are safe to call
 * inside `useMemo` and `useEffect` dependency arrays.
 */

import type {
  NotificationResponseDto,
  NotificationResponseDtoChannel,
  NotificationResponseDtoType,
  NotificationPreferencesResponseDto,
  UnreadCountResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Notification type alias ───────────────────────────────────────────────

/**
 * Notification channel.
 *
 * Mirrors the generated `NotificationResponseDtoChannel` values.
 * The UI surfaces only the `in_app` channel; the others are delivery
 * metadata used by the backend and are not rendered.
 */
export type NotificationChannel = NotificationResponseDtoChannel;

/**
 * Notification type.
 *
 * Mirrors the generated `NotificationResponseDtoType` enum. The Phase 5
 * UI surfaces these notifications at the domain level (achievement,
 * tournament, social, comment, system) — the storage-level enum
 * identifiers map to those domains via the icon mapper in the popover
 * component.
 */
export type NotificationType = NotificationResponseDtoType;

/**
 * Notification priority.
 *
 * Surfaced by the UI to influence visual styling (urgent = red border,
 * high = amber, normal = blue, low = none). The backend does not yet
 * emit a `priority` field; the field is optional and defaults to
 * `'normal'` when absent.
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

// ─── Filter shapes ──────────────────────────────────────────────────────────

/**
 * URL-syncable filter state for the notification list page.
 *
 * Serialised to URL search params by the page-level filter hook (Batch B
 * scope). The `cursor` field is preserved through filter changes so
 * back/forward navigation lands on the same page.
 */
export interface NotificationListFilters {
  /** Filter to unread notifications only. `undefined` means "all". */
  unreadOnly?: boolean;
  /** Filter to a single notification type. `undefined` means "all". */
  type?: NotificationType;
  /** Filter to notifications created after this ISO 8601 date. */
  fromDate?: string;
  /** Filter to notifications created before this ISO 8601 date. */
  toDate?: string;
  /** Opaque pagination cursor. `undefined` means "first page". */
  cursor?: string;
  /** Optional per-page limit. The hook defaults to a Phase-3 value. */
  limit?: number;
}

/**
 * Default filter state for the notification list page.
 *
 * Centralised here so the URL-sync hook, the page, and the URL
 * initializer agree on the empty filter shape.
 */
export const DEFAULT_NOTIFICATION_LIST_FILTERS: NotificationListFilters = {
  unreadOnly: undefined,
  type: undefined,
  fromDate: undefined,
  toDate: undefined,
  cursor: undefined,
  limit: undefined,
};

// ─── Page shapes ───────────────────────────────────────────────────────────

/**
 * Cursor-pagination result shape for the notification list.
 *
 * `items` is the deduped list of `Notification`; `nextCursor` is the
 * opaque cursor the SDK returned; `hasNextPage` follows the pagination
 * metadata.
 */
export interface NotificationListPage {
  items: readonly Notification[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

// ─── Domain types ──────────────────────────────────────────────────────────

/**
 * Notification row for the list, popover, and center views.
 *
 * Extends the generated `NotificationResponseDto` with an `id` alias
 * so SWR deduplication (`appendUniqueById`) works. The generated DTO
 * uses `notificationId`, not `id`.
 *
 * Note: `priority` is not yet emitted by the backend; the field is
 * optional and defaults to `'normal'` when absent. Components branch
 * on the field with `'normal'` as the default.
 */
export type Notification = NotificationResponseDto & {
  /** Alias of `notificationId` for SWR deduplication. */
  id: string;
  /** Server-authoritative priority. Default: `'normal'`. */
  priority?: NotificationPriority;
};

/**
 * The user's notification preferences.
 *
 * Mirrors the generated `NotificationPreferencesResponseDto`. All fields
 * are boolean toggles except `rankImprovementThreshold` and the
 * `quietHoursStart` / `quietHoursEnd` strings.
 */
export type NotificationPreferences = NotificationPreferencesResponseDto;

/**
 * Unread count response.
 *
 * Mirrors the generated `UnreadCountResponseDto`. The value is always
 * server-authoritative; clients never decrement it below zero.
 */
export type UnreadCount = UnreadCountResponseDto;

// ─── Mutation result shapes ───────────────────────────────────────────────

/**
 * Result of a successful mark-read mutation.
 *
 * The backend returns `void` for `POST /api/v1/notifications/:id/read`,
 * `POST /api/v1/notifications/:id/unread`, and `POST /api/v1/notifications/read-all`.
 * The hook synthesises the result from the optimistic update + server
 * revalidation. `unreadCount` is the post-mutation server-authoritative
 * count from a follow-up `getUnreadCount` call.
 */
export interface NotificationReadMutationResult {
  notificationId: string;
  unreadCount: number;
  readAt: string;
}

/**
 * Result of a successful mark-all-read mutation.
 */
export interface MarkAllReadMutationResult {
  markedCount: number;
  unreadCount: number;
}

/**
 * Result of a successful delete notification mutation.
 */
export interface DeleteNotificationMutationResult {
  notificationId: string;
  /** The unread count before the deletion was applied. */
  previousUnreadCount: number;
  /** The unread count after the deletion. */
  unreadCount: number;
}

// ─── Mutation state ───────────────────────────────────────────────────────

/**
 * Local mutation state machine for notification CTAs.
 *
 * Follows the same pattern as `RegistrationMutationState` from
 * `tournament.types.ts` and `useOptimisticMutation` from Phase 4.
 *
 * State transitions:
 *   idle → pending (on mutation call)
 *   pending → success (on success)
 *   pending → error (on failure)
 *   success → idle (after 1 s or on next interaction)
 *   error → idle (when user resets or retries)
 */
export type NotificationMutationState =
  | "idle"
  | "pending"
  | "success"
  | "error";

// ─── Error codes ──────────────────────────────────────────────────────────

/**
 * Error codes specific to notification mutations.
 *
 * These codes are returned by the backend when a notification mutation
 * fails. Components should branch on these codes using `getUserCopy`
 * from Epic 5.1 D3 — never on HTTP status codes.
 *
 * The typed `NOTIFICATION_*` codes are mirrored in `error-codes.ts`.
 * The `UNAUTHORIZED` and `FORBIDDEN` codes are shared with the global
 * `GLOBAL_*` table.
 */
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

// ─── Serialisation ────────────────────────────────────────────────────────

/**
 * Serialize the notification list filters to a stable, URL-safe key fragment.
 *
 * Pure function used by `NOTIFICATION_CACHE_KEYS.list` and the
 * URL-sync hook. Two equal filter objects produce equal strings;
 * field order is fixed so the cache key never depends on object
 * insertion order.
 */
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

// ─── SWR cache keys ────────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.4 notification surfaces.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are
 * safe to call inside `useMemo` and `useEffect` dependency arrays.
 *
 * ## Invalidation strategy
 *
 * After a successful mark-read / mark-unread / delete mutation, the
 * following keys must be invalidated:
 *   1. `list` (any active filter scoping) — the row's read state may change
 *   2. `unreadCount` — the bell badge must revalidate
 *
 * Use `NOTIFICATION_CACHE_KEYS.invalidateAfterMutation` to get the
 * full invalidation key set in one call.
 */
export const NOTIFICATION_CACHE_KEYS = {
  /**
   * SWR key for the cursor-paginated notification list.
   *
   * Scoped by the serialised filter shape so different filter
   * combinations do not collide.
   */
  list(filters: NotificationListFilters) {
    return [
      "notifications",
      "list",
      serializeNotificationFilters(filters),
    ] as const;
  },

  /**
   * SWR key for a single notification detail.
   */
  detail(notificationId: string) {
    return ["notifications", "detail", notificationId] as const;
  },

  /**
   * SWR key for the user's notification preferences.
   *
   * Singleton key (no user arg) — preferences are per-user and the
   * backend scopes via the access token.
   */
  preferences() {
    return ["notifications", "preferences"] as const;
  },

  /**
   * SWR key for the unread count.
   *
   * Singleton key — the count is per-user and the backend scopes via
   * the access token.
   */
  unreadCount() {
    return ["notifications", "unread-count"] as const;
  },

  /**
   * Returns the full invalidation key set for after a mutation.
   *
   * Use this to invalidate all notification-related SWR keys after a
   * successful mark-read / mark-unread / delete mutation:
   *   - Notification list (the row's read state may change)
   *   - Notification detail (if the row is currently fetched)
   *   - Unread count (the bell badge must revalidate)
   *
   * @example
   *   const keys = NOTIFICATION_CACHE_KEYS.invalidateAfterMutation();
   *   await Promise.all([
   *     mutate(keys.list(filters), undefined, { revalidate: true }),
   *     mutate(keys.unreadCount(), undefined, { revalidate: true }),
   *   ]);
   */
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
