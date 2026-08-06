/**
 * `friend-request-mutation.service.ts` — Thin SDK pass-throughs for the
 * friend-request lifecycle mutation endpoints and the unfriend endpoint.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.C1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for:
 *
 *   - `POST   /api/v1/social/friend-requests/:userId`              — `sendFriendRequest`
 *   - `POST   /api/v1/social/friend-requests/:friendshipId/respond` — `respondFriendRequest`
 *   - `DELETE /api/v1/social/friend-requests/:friendshipId`        — `cancelFriendRequest`
 *   - `DELETE /api/v1/social/friends/:userId`                      — `unfriend`
 *
 * Consumed by `useSendFriendRequest` (TKT-6.8.D1),
 * `useRespondFriendRequest` (TKT-6.8.D2),
 * `useCancelFriendRequest` (TKT-6.8.D3), and `useUnfriend` (TKT-6.8.D4).
 *
 * ## Pattern
 *
 * Follows the Phase 5 / 6 / 6.6 / 6.7 service-wrapper convention
 * (`relationship.service.ts`, `social-graph.service.ts`,
 * `follow-mutation.service.ts`, `block-mutation.service.ts`):
 *
 *   - Pure forwarder — no side-effects, no cache mutations, no
 *     feature-flag gating. Feature flags live in the mutation hooks.
 *   - `ApiError` is propagated unchanged so callers can branch on
 *     `apiError.code`.
 *   - One `phase6:6.8` Sentry breadcrumb per call (via
 *     `addFriendRequestMutationBreadcrumb` in `phase6_6_8_sentry.ts`).
 *   - Internal `friendshipId` is never surfaced: `sendFriendRequest`
 *     and `unfriend` return `void` on success (the SDK emits 201/204
 *     No Content); `respondFriendRequest` and `cancelFriendRequest`
 *     also return `void` on success. `friendshipId` is consumed only
 *     as an in-memory path-parameter argument; it is never persisted
 *     in SWR cache keys, URLs, localStorage, sessionStorage, or
 *     `window.history`.
 *
 * ## Non-idempotent DELETE behaviour
 *
 * `cancelFriendRequest` calls `DELETE /social/friend-requests/:friendshipId`.
 * The backend returns `404 + code: 'SOCIAL_FRIEND_REQUEST_NOT_FOUND'` when the
 * request is no longer pending. The service maps this to an `ApiError` so the
 * caller (`useCancelFriendRequest`) can distinguish "already cancelled"
 * (terminal success) from a genuine error.
 *
 * `unfriend` calls `DELETE /social/friends/:userId`. The backend returns
 * `404 + code: 'SOCIAL_FRIENDSHIP_NOT_FOUND'` when the viewer is not
 * currently friends with the target. The service maps this to an `ApiError`
 * so the caller (`useUnfriend`) can distinguish "already unfriended"
 * (terminal success) from a genuine error.
 *
 * ## Respond action validation
 *
 * `respondFriendRequest` accepts a discriminated `action: 'accept' | 'decline'`
 * argument and maps it internally to the SDK's `{ accept: boolean }` body
 * field. The discriminated string union is enforced at the type level so the
 * service never constructs an unknown body shape; the server independently
 * enforces the action whitelist.
 *
 * ## Internal-id leakage defence
 *
 * The send / respond / cancel / unfriend endpoints return 201/204 No
 * Content. The friendship-id (`friendshipId`) is consumed only as the
 * path parameter for respond / cancel and is never returned in any
 * response body or returned to the caller. The service therefore cannot
 * inadvertently surface `friendshipId`.
 *
 * ## Deprecated-route guard
 *
 * The service does NOT call any deprecated route. The deprecated
 * `ANY /social/friend-request` (singular) is named in
 * `lib/api/deprecated-routes.ts`; the lint invariants script
 * (`scripts/phase6-lint-invariants.mjs`, extended by TKT-6.8.G2) asserts
 * that `features/social/services/friend-request-mutation.service.ts`
 * does not import `socialControllerDeprecatedFriendRequestPath*`.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful friend-request mutation, callers revalidate the
 * relationship, incoming-friend-requests, outgoing-friend-requests, and
 * counts keys via `mutateCarefully`. When Epic 6.10 lands, the Phase 5
 * `/notifications` socket will emit `friend.request.received`,
 * `friend.request.responded`, `friend.request.cancelled`, `friend.added`,
 * and `friend.removed` events that trigger the same invalidation.
 * See TKT-6.8.G3 for the integration documentation.
 */

import { ApiError, getSocial } from "@/lib/api";

import {
  addFriendRequestMutationBreadcrumb,
  SOCIAL_6_8_ROUTES,
} from "@/lib/social/phase6_6_8_sentry";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Discriminated action accepted by `respondFriendRequest`. The string
 * union is the public action vocabulary; the service maps it internally
 * to the SDK's `{ accept: boolean }` body field.
 */
export type RespondFriendRequestAction = "accept" | "decline";

// ─── Measured-call helper ───────────────────────────────────────────────────

/**
 * Wraps an async SDK call with timing and breadcrumbs. Mirrors the
 * Epic 6.6 / 6.7 pattern (`follow-mutation.service.ts → measuredCall`,
 * `block-mutation.service.ts → measuredCall`) but scoped to the
 * `phase6:6.8` Sentry category.
 *
 * `friendshipId` is NOT a parameter here — it is never part of any
 * breadcrumb payload (cross-batch invariant 8: "Unstable `friendshipId`
 * hygiene").
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
    addFriendRequestMutationBreadcrumb({
      route:
        SOCIAL_6_8_ROUTES[args.route as keyof typeof SOCIAL_6_8_ROUTES] ??
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
      addFriendRequestMutationBreadcrumb({
        route:
          SOCIAL_6_8_ROUTES[args.route as keyof typeof SOCIAL_6_8_ROUTES] ??
          args.route,
        method: args.method,
        status: err.status,
        durationMs,
        code: err.code,
        targetUserId: args.targetUserId,
      });
    } else {
      // Network error (non-HTTP).
      addFriendRequestMutationBreadcrumb({
        route:
          SOCIAL_6_8_ROUTES[args.route as keyof typeof SOCIAL_6_8_ROUTES] ??
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

// ─── Send friend request ────────────────────────────────────────────────────

/**
 * `POST /api/v1/social/friend-requests/:userId`
 *
 * Send a friend request to the target user. The backend returns 201
 * Created (or 204 No Content) on success. The response body never
 * carries the `friendshipId`; the caller does not need it (the next
 * revalidation cycle fetches the relationship from the server).
 *
 * Error codes surfaced:
 *   - `SOCIAL_FRIEND_REQUEST_FORBIDDEN` — generic forbid (e.g. receiver
 *     has privacy-restricted friend requests)
 *   - `SOCIAL_SELF_FRIEND_REQUEST`     — cannot send to yourself
 *   - `SOCIAL_USER_BLOCKED`            — blocked by the target
 *   - `SOCIAL_BLOCKED_USER`            — you have blocked the target
 *   - `UNAUTHORIZED`                   — not signed in
 *   - `RATE_LIMITED`                   — too many requests
 *   - `INTERNAL_SERVER_ERROR`          — unexpected server error
 *
 * @param userId The target user's stable identifier.
 * @returns Resolves on success (void — 201 / 204 No Content).
 * @throws ApiError on failure. Callers branch on `apiError.code`.
 */
export async function sendFriendRequest(userId: string): Promise<void> {
  await measuredCall({
    action: "sendFriendRequest",
    targetUserId: userId,
    method: "POST",
    route: "social.sendFriendRequest",
    call: async () => {
      void await getSocial().socialControllerSendFriendRequest(userId);
      // 201 / 204 No Content — nothing to project. `friendshipId` is
      // never returned to the caller; the next SWR revalidation cycle
      // surfaces the relationship from the server.
      return undefined as void;
    },
  });
}

// ─── Respond to friend request ──────────────────────────────────────────────

/**
 * `POST /api/v1/social/friend-requests/:friendshipId/respond`
 *
 * Accept or decline a friend request. The backend returns 204 No
 * Content on success.
 *
 * The `friendshipId` is consumed ONLY as the path parameter. It is
 * never persisted in SWR cache keys, URLs, localStorage,
 * sessionStorage, or `window.history`. It is never part of any
 * Sentry breadcrumb payload (cross-batch invariant 8).
 *
 * The `action` argument is a discriminated string union
 * (`'accept' | 'decline'`) — the service maps it internally to the
 * SDK's `{ accept: boolean }` body field. The type system rejects any
 * other value at compile time; the server independently enforces the
 * action whitelist.
 *
 * Error codes surfaced:
 *   - `SOCIAL_FRIEND_REQUEST_NOT_FOUND` — request no longer pending
 *                                       (non-idempotent DELETE
 *                                       terminal state when treated
 *                                       as success by the caller)
 *   - `SOCIAL_FRIEND_REQUEST_FORBIDDEN` — not authorised to respond
 *   - `UNAUTHORIZED`                   — not signed in
 *   - `INTERNAL_SERVER_ERROR`          — unexpected server error
 *
 * @param friendshipId The unstable internal id of the friend request
 *                     (path parameter). Never persisted outside this
 *                     function call.
 * @param action       Discriminated action: `'accept' | 'decline'`.
 * @returns Resolves on success (void — 204 No Content).
 * @throws ApiError on failure. Callers distinguish
 *         `SOCIAL_FRIEND_REQUEST_NOT_FOUND` (terminal state) from
 *         genuine errors.
 */
export async function respondFriendRequest(
  friendshipId: string,
  action: RespondFriendRequestAction,
): Promise<void> {
  await measuredCall({
    action: "respondFriendRequest",
    // The breadcrumb payload uses the action verb as the correlation
    // key (it never carries the unstable `friendshipId`).
    targetUserId: action,
    method: "POST",
    route: "social.respondFriendRequest",
    call: async () => {
      void await getSocial().socialControllerRespondToFriendRequest(
        friendshipId,
        { accept: action === "accept" },
      );
      // 204 No Content — nothing to project.
      return undefined as void;
    },
  });
}

// ─── Cancel friend request ──────────────────────────────────────────────────

/**
 * `DELETE /api/v1/social/friend-requests/:friendshipId`
 *
 * Cancel a pending friend request that the viewer sent. The backend
 * returns 204 No Content on success.
 *
 * The `friendshipId` is consumed ONLY as the path parameter. It is
 * never persisted in SWR cache keys, URLs, localStorage,
 * sessionStorage, or `window.history`. It is never part of any
 * Sentry breadcrumb payload (cross-batch invariant 8).
 *
 * Error codes surfaced:
 *   - `SOCIAL_FRIEND_REQUEST_NOT_FOUND` — request no longer pending
 *                                       (non-idempotent DELETE →
 *                                       treated as terminal success by
 *                                       the caller, NOT as an error
 *                                       banner)
 *   - `SOCIAL_FRIEND_REQUEST_FORBIDDEN` — not authorised to cancel
 *   - `UNAUTHORIZED`                   — not signed in
 *   - `INTERNAL_SERVER_ERROR`          — unexpected server error
 *
 * @param friendshipId The unstable internal id of the friend request
 *                     (path parameter). Never persisted outside this
 *                     function call.
 * @returns Resolves on success (void — 204 No Content).
 * @throws ApiError on failure. Callers distinguish
 *         `SOCIAL_FRIEND_REQUEST_NOT_FOUND` (terminal state) from
 *         genuine errors.
 */
export async function cancelFriendRequest(
  friendshipId: string,
): Promise<void> {
  await measuredCall({
    action: "cancelFriendRequest",
    // The breadcrumb payload correlates on the action verb — the
    // unstable `friendshipId` is never included.
    targetUserId: "cancelFriendRequest",
    method: "DELETE",
    route: "social.cancelFriendRequest",
    call: async () => {
      void await getSocial().socialControllerCancelFriendRequest(
        friendshipId,
      );
      // 204 No Content — nothing to project.
      return undefined as void;
    },
  });
}

// ─── Unfriend ───────────────────────────────────────────────────────────────

/**
 * `DELETE /api/v1/social/friends/:userId`
 *
 * Remove the target user from the viewer's friend list. The backend
 * returns 204 No Content on success.
 *
 * The `userId` is the only stable identifier; `friendshipId` is not
 * accepted by this endpoint and is never referenced by this service
 * function (cross-batch invariant 7: "Stable identifier for send /
 * unfriend").
 *
 * Error codes surfaced:
 *   - `SOCIAL_FRIENDSHIP_NOT_FOUND`    — not currently friends with
 *                                       the target (non-idempotent
 *                                       DELETE → treated as terminal
 *                                       success by the caller, NOT as
 *                                       an error banner)
 *   - `SOCIAL_FRIEND_LIST_FORBIDDEN`   — not authorised to view / mutate
 *                                       the target's friend list
 *   - `UNAUTHORIZED`                   — not signed in
 *   - `INTERNAL_SERVER_ERROR`          — unexpected server error
 *
 * @param userId The target user's stable identifier.
 * @returns Resolves on success (void — 204 No Content).
 * @throws ApiError on failure. Callers distinguish
 *         `SOCIAL_FRIENDSHIP_NOT_FOUND` (terminal state) from genuine
 *         errors.
 */
export async function unfriend(userId: string): Promise<void> {
  await measuredCall({
    action: "unfriend",
    targetUserId: userId,
    method: "DELETE",
    route: "social.removeFriend",
    call: async () => {
      void await getSocial().socialControllerRemoveFriend(userId);
      // 204 No Content — nothing to project.
      return undefined as void;
    },
  });
}