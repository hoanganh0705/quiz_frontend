/**
 * `block-mutation.service.ts` — Thin SDK pass-throughs for the block /
 * unblock mutation endpoints.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.C1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for:
 *
 *   - `POST /api/v1/social/block/:userId`   — `blockUser`
 *   - `DELETE /api/v1/social/block/:userId` — `unblockUser`
 *
 * Consumed by `useBlock` (TKT-6.7.D1) and `useUnblock` (TKT-6.7.D2).
 *
 * ## Pattern
 *
 * Follows the Phase 5 / 6 / 6.6 service-wrapper convention
 * (`relationship.service.ts`, `social-graph.service.ts`,
 * `follow-mutation.service.ts`):
 *
 *   - Pure forwarder — no side-effects, no cache mutations, no
 *     feature-flag gating. Feature flags live in the mutation hooks.
 *   - `ApiError` is propagated unchanged so callers can branch on
 *     `apiError.code`.
 *   - One `social:6.7` Sentry breadcrumb per block / unblock call
 *     (via `addBlockMutationBreadcrumb` in `social-discovery-search-sentry.ts`).
 *   - Internal `followId` / `friendshipId` are never surfaced: both
 *     `blockUser` and `unblockUser` return `void` on success (the SDK
 *     emits 201/204 No Content).
 *
 * ## Non-idempotent DELETE behaviour
 *
 * `unblockUser` calls `DELETE /social/block/:userId`. The backend
 * returns `404 + code: 'SOCIAL_USER_NOT_BLOCKED'` when the viewer is
 * not currently blocking the target. The service propagates this as
 * an `ApiError` so the caller (`useUnblock`) can distinguish
 * "already unblocked" (terminal success) from a genuine error.
 *
 * ## Bidirectional side effects
 *
 * Block is bidirectional: when A blocks B, B cannot see A's content,
 * follow A, or send A a friend request. The server enforces this; the
 * UI mirrors it via `BlockedContentGate` and `useSocialPermissions`.
 * The service does not need to handle bidirectionality client-side.
 *
 * If A blocks B and A was previously following B, the server silently
 * removes that follow. The service does not surface this as an error;
 * the caller (TKT-6.7.D1) revalidates the relationship and counts keys
 * after the call to converge the UI without an explicit error banner.
 *
 * ## Internal-id leakage defence
 *
 * The block / unblock endpoints return 201/204 No Content. Neither
 * response carries `followId` or `friendshipId`. The service therefore
 * cannot inadvertently surface them.
 *
 * ## Deprecated-route guard
 *
 * The service does NOT call any deprecated route. The deprecated
 * `ANY /social/friend-request` (singular) is named in
 * `lib/api/deprecated-routes.ts`; the lint invariants script
 * (`scripts/social-lint-invariants.mjs`, extended by TKT-6.7.G3)
 * asserts that no path under `features/social/services/` imports
 * `socialControllerDeprecatedFriendRequestPath*`.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful block / unblock, callers revalidate the
 * relationship, blocked-users, and counts keys via `mutateCarefully`.
 * When Epic 6.10 lands, the Phase 5 `/notifications` socket will emit
 * `blocked.changed` and `relationship.changed` events that trigger
 * the same invalidation. See TKT-6.7.G1 for the integration spec.
 */

import { ApiError, getSocial } from "@/lib/api";

import {
  addBlockMutationBreadcrumb,
  SOCIAL_6_7_ROUTES,
} from "@/lib/social/social-discovery-search-sentry";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Optional input to `blockUser`.
 *
 * The backend's `BlockUserDto` accepts a single optional `reason` field
 * (max 500 chars). The field is not surfaced in any UI today; it is
 * accepted here so the service can support future "report-and-block"
 * flows without a second round-trip.
 */
export interface BlockUserInput {
  /** Optional free-text reason recorded against the block. */
  reason?: string;
}

// ─── Measured-call helper ───────────────────────────────────────────────────

/**
 * Wraps an async SDK call with timing and breadcrumbs. Mirrors the
 * Epic 6.6 pattern (`follow-mutation.service.ts → measuredCall`) but
 * scoped to the `social:6.7` Sentry category.
 */
async function measuredCall<T>(args: {
  action: string;
  targetUserId: string;
  method: "POST" | "DELETE";
  route: string;
  call: () => Promise<T>;
}): Promise<T> {
  const start = performance.now();
  try {
    const result = await args.call();
    const durationMs = performance.now() - start;
    addBlockMutationBreadcrumb({
      route:
        SOCIAL_6_7_ROUTES[args.route as keyof typeof SOCIAL_6_7_ROUTES] ??
        args.route,
      method: args.method,
      status: 200,
      durationMs,
      targetUserId: args.targetUserId,
    });
    return result;
  } catch (err) {
    const durationMs = performance.now() - start;
    if (err instanceof ApiError) {
      addBlockMutationBreadcrumb({
        route:
          SOCIAL_6_7_ROUTES[args.route as keyof typeof SOCIAL_6_7_ROUTES] ??
          args.route,
        method: args.method,
        status: err.status,
        durationMs,
        code: err.code,
        targetUserId: args.targetUserId,
      });
    } else {
      // Network error (non-HTTP).
      addBlockMutationBreadcrumb({
        route:
          SOCIAL_6_7_ROUTES[args.route as keyof typeof SOCIAL_6_7_ROUTES] ??
          args.route,
        method: args.method,
        status: undefined,
        durationMs,
        targetUserId: args.targetUserId,
      });
    }
    throw err;
  }
}

// ─── Block / Unblock mutations ──────────────────────────────────────────────

/**
 * `POST /api/v1/social/block/:userId`
 *
 * Block a user. The backend returns 201 Created (or 204 No Content) on
 * success. The block is bidirectional: once blocked, the target user
 * cannot see the actor's content, follow the actor, or send the actor
 * a friend request. If the actor was previously following the target,
 * the server silently removes that follow.
 *
 * Error codes surfaced:
 *   - `SOCIAL_BLOCKED_USER`      — you have already blocked the target
 *   - `SOCIAL_USER_BLOCKED`      — blocked by the target
 *   - `GLOBAL_UNAUTHENTICATED`   — not signed in
 *   - `GLOBAL_RATE_LIMITED`      — too many requests
 *   - `GLOBAL_INTERNAL_ERROR`    — unexpected server error
 *
 * @param userId The target user's stable identifier.
 * @param input  Optional block metadata (currently only `reason`).
 * @returns Resolves on success (void — 201 / 204 No Content).
 * @throws ApiError on failure. Callers branch on `apiError.code`.
 */
export async function blockUser(
  userId: string,
  input: BlockUserInput = {},
): Promise<void> {
  await measuredCall({
    action: "block",
    targetUserId: userId,
    method: "POST",
    route: "social.blockUser",
    call: async () => {
      void await getSocial().socialControllerBlockUser(userId, input);
      // 201 / 204 No Content — nothing to project.
      return undefined as void;
    },
  });
}

/**
 * `DELETE /api/v1/social/block/:userId`
 *
 * Unblock a user. The backend returns 204 No Content on success. After
 * unblock, the prior relationship state (followed / not-followed,
 * pending friend request / none) is restored as it was before the block.
 *
 * Error codes surfaced:
 *   - `SOCIAL_USER_NOT_BLOCKED`  — not currently blocking the target
 *                                  (non-idempotent DELETE → treated as
 *                                  terminal success by the caller, NOT
 *                                  as an error banner)
 *   - `SOCIAL_BLOCKED_USER`      — you have blocked the target (you
 *                                  cannot unblock yourself if blocked by
 *                                  the target; the backend returns this
 *                                  for that case)
 *   - `GLOBAL_UNAUTHENTICATED`   — not signed in
 *   - `GLOBAL_RATE_LIMITED`      — too many requests
 *   - `GLOBAL_INTERNAL_ERROR`    — unexpected server error
 *
 * @param userId The target user's stable identifier.
 * @returns Resolves on success (void — 204 No Content).
 * @throws ApiError on failure. Callers distinguish
 *         `SOCIAL_USER_NOT_BLOCKED` (terminal state) from genuine errors.
 */
export async function unblockUser(userId: string): Promise<void> {
  await measuredCall({
    action: "unblock",
    targetUserId: userId,
    method: "DELETE",
    route: "social.unblockUser",
    call: async () => {
      void await getSocial().socialControllerUnblockUser(userId);
      // 204 No Content — nothing to project.
      return undefined as void;
    },
  });
}