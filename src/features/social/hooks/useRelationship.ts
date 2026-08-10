"use client";

/**
 * `useRelationship` — read hook for the relationship status between
 * the viewer and a target user.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.D1.
 *
 * ## What this hook owns
 *
 * - Fetch the relationship status via the verified `getRelationshipStatus`
 *   service wrapper (TKT-6.1.E1).
 * - Normalise the SDK boolean-tuple DTO into the canonical `Relationship`
 *   projection via `stripRelationshipInternalIds` (TKT-6.1.C2).
 * - Short-circuit to `Relationship.self` when the target userId equals
 *   the current userId (the backend returns 400 in that case — we
 *   avoid the round-trip).
 * - Short-circuit to `Relationship.none` when the viewer is
 *   unauthenticated.
 * - Short-circuit to `Relationship.none` when `social_relationship_live`
 *   is `'placeholder'`.
 * - Map `SOCIAL_USER_NOT_FOUND` (404) to `Relationship.none` with
 *   `error: null` — the target genuinely has no relationship to the
 *   viewer.
 * - Surface typed `SocialErrorCode` on every other error path.
 * - Expose `{ relationship, isLoading, isStale, error, retry }` per the
 *   cross-batch invariant of the Batch-D hook contract.
 *
 * ## Auth reads
 *
 * The hook reads the current userId from `useAuthSession` (Phase 2.5).
 * Auth bootstrap state is the canonical source; the hook does not call
 * `/auth/me` directly.
 *
 * ## Server authority
 *
 * `Relationship` is entirely server-derived. The client never infers
 * a relationship from local state — the SWR cache is the only state,
 * and the SWR cache is mutated only by the service call or the
 * broadcast-channel invalidation (TKT-6.1.B2).
 */

import { useCallback, useMemo } from "react";

import { ApiError, coerceToApiError, useSingleWithRetry } from "@/lib/api";
import type { ErrorCode } from "@/lib/api/error-codes";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { stripRelationshipInternalIds } from "@/features/social/dto-adapters";
import { getRelationshipStatus } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  asErrorCode,
  isSocialErrorCode,
  type Relationship,
  type SocialErrorCode,
} from "@/features/social/types";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * The lifecycle error code surfaced by `useRelationship`. A strict
 * subset of the global `ErrorCode` union restricted to the codes the
 * relationship endpoint can emit.
 */
export type UseRelationshipErrorCode = SocialErrorCode | ErrorCode;

/**
 * Result of `useRelationship`.
 *
 * Field semantics (mirrors the cross-batch contract for Batch-D hooks):
 *
 *   - `relationship` — the canonical `Relationship` value. Always
 *     defined; defaults to `'none'` while loading or on error.
 *   - `isLoading` — `true` while the initial fetch is in flight.
 *   - `isStale` — `true` when a revalidation fails with cached data
 *     present (per `useSingleWithRetry`'s contract).
 *   - `error` — the typed `ApiError` (or `null`). The error's `code`
 *     is the raw backend code (`SOCIAL_USER_BLOCKED`,
 *     `GLOBAL_UNAUTHENTICATED`, …); callers narrow with
 *     `isSocialErrorCode` to get the `SocialErrorCode` projection.
 *   - `retry` — revalidates the SWR key and resets the error.
 */
export interface UseRelationshipResult {
  relationship: Relationship;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /**
   * Whether the viewer is signed in. `false` when the auth bootstrap
   * reports unauthenticated OR the flag is `'placeholder'` OR the
   * target userId is null. Consumers that need to render an
   * authenticated-only CTA can read this flag without re-reading
   * `useAuthSession`.
   */
  isAuthenticated: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * The terminal "no service call" result. Returned when:
 *
 *   - The flag is `'placeholder'`.
 *   - The viewer is unauthenticated.
 *
 * The hook produces this shape directly so consumers never have to
 * branch on the "did we make a request?" question.
 */
const NO_REQUEST_RESULT: UseRelationshipResult = Object.freeze({
  relationship: "none",
  isLoading: false,
  isStale: false,
  error: null,
  retry: () => Promise.resolve(),
  isAuthenticated: false,
});

/**
 * Build a `Relationship.self` short-circuit result. Returned when the
 * target userId equals the viewer's userId — the backend rejects the
 * call with `SOCIAL_SELF_FRIEND_REQUEST` and the relationship is
 * trivially `self`.
 */
const SELF_RESULT: UseRelationshipResult = Object.freeze({
  relationship: "self",
  isLoading: false,
  isStale: false,
  error: null,
  retry: () => Promise.resolve(),
  isAuthenticated: true,
});

/**
 * Compose the short-circuit result from the boolean guards. Centralised
 * so the hook body stays linear.
 */
function resolveShortCircuit(args: {
  isFlagPlaceholder: boolean;
  isAuthenticated: boolean;
  targetUserId: string | null;
  isSelf: boolean;
}): UseRelationshipResult | null {
  if (args.isFlagPlaceholder) return NO_REQUEST_RESULT;
  if (!args.isAuthenticated) return NO_REQUEST_RESULT;
  if (args.targetUserId === null) return NO_REQUEST_RESULT;
  if (args.isSelf) return SELF_RESULT;
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseRelationshipOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthSession`.
   */
  currentUserId?: string | null;
}

export function useRelationship(
  targetUserId: string | null,
  options: UseRelationshipOptions = {},
): UseRelationshipResult {
  const flagValue = getFeatureFlagValue("social_relationship_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const overrideUserId = options.currentUserId ?? null;
  const viewerUserId = overrideUserId ?? auth.currentUser?.userId ?? null;
  const isAuthenticated = auth.isAuthenticated && viewerUserId !== null;

  // ── Short-circuit guards (declared up-front, evaluated later) ──────────
  //
  // Order matters: `self` is checked before `none` so the terminal
  // values match the cross-batch invariant table.

  const isSelf = useMemo<boolean>(() => {
    if (targetUserId === null) return false;
    if (viewerUserId === null) return false;
    return targetUserId === viewerUserId;
  }, [targetUserId, viewerUserId]);

  // Disabled sentinel key — returned when no service call should fire.
  // SWR treats `null` keys as "do not fetch".
  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    if (targetUserId === null) return null;
    if (isSelf) return null;
    return SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId);
  }, [isFlagPlaceholder, isAuthenticated, targetUserId, isSelf]);

  const fetcher = useCallback(
    async (): Promise<Relationship> => {
      // Defensive: even though the key is gated, a manual `retry()`
      // might call this with a stale closure. Guard explicitly.
      if (isFlagPlaceholder) return "none";
      if (!isAuthenticated) return "none";
      if (targetUserId === null) return "none";
      if (isSelf) return "self";

      try {
        const envelope = await getRelationshipStatus(targetUserId);
        // Normalise via the adapter. `stripRelationshipInternalIds`
        // returns a frozen projection; the underlying `toRelationship`
        // collapses the boolean flags into the canonical enum value.
        const projection = stripRelationshipInternalIds(envelope?.data);
        return projection.relationship;
      } catch (err) {
        const apiErr = coerceToApiError(err);
        // 404 → the target user genuinely has no relationship with the
        // viewer. Treat as `Relationship.none` with no error surface —
        // the UI renders the "none" CTA. The backend uses either
        // `GLOBAL_NOT_FOUND` (when the user id is unknown) or
        // `USER_NOT_FOUND` (when the user exists but the relationship
        // service has no row for them); both reduce to `Relationship.none`.
        if (
          apiErr.code === "GLOBAL_NOT_FOUND" ||
          apiErr.code === "USER_NOT_FOUND" ||
          apiErr.status === 404
        ) {
          return "none";
        }
        throw apiErr;
      }
    },
    [isFlagPlaceholder, isAuthenticated, targetUserId, isSelf],
  );

  const result = useSingleWithRetry<Relationship>({
    key,
    fetcher,
  });

  const retry = useCallback(async () => {
    await result.retry();
    // `result` is read here for its `retry` method; the lint exhaustive
    // deps rule wants the full result, which is fine — the result
    // reference is stable across renders in `useSingleWithRetry`.
    void result;
  }, [result]);

  // Map the raw backend code into the typed union so consumers can
  // narrow with `isSocialErrorCode`.
  const mappedError = useMemo<ApiError | null>(() => {
    if (result.error === null) return null;
    const raw = result.error.code;
    const mapped: ErrorCode = isSocialErrorCode(raw)
      ? asErrorCode(raw)
      : (raw as ErrorCode | undefined) ?? "GLOBAL_INTERNAL_ERROR";
    return ApiError.fromInput({
      status: result.error.status,
      code: mapped,
      message: result.error.detail,
      title: result.error.title,
      requestId: result.error.requestId,
    });
  }, [result.error]);

  // Short-circuit paths win over the SWR-driven result. The short-circuit
  // branch is the only place the hook returns a non-loading, non-null
  // state for the lifecycle code; callers that want to know whether a
  // request is in flight check `isLoading`.
  const shortCircuit = resolveShortCircuit({
    isFlagPlaceholder,
    isAuthenticated,
    targetUserId,
    isSelf,
  });
  if (shortCircuit !== null) return shortCircuit;

  return {
    relationship: result.data ?? "none",
    isLoading: result.isLoading,
    isStale: false,
    error: mappedError,
    retry,
    isAuthenticated: true,
  };
}

// Exported for tests / cross-checking — not part of the public API.
export const __testing = {
  resolveShortCircuit,
  NO_REQUEST_RESULT,
  SELF_RESULT,
};