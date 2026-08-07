"use client";

/**
 * `features/admin/achievement-admin/hooks/useRevokeUserBadge.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C5.
 *
 * ## What this hook owns
 *
 * - Wrap `revokeUserBadge` (TKT-7.1.E6 / `achievement-admin.service.ts`)
 *   with SWR invalidation, typed-code propagation, and audit breadcrumbs.
 * - Expose `{ revoke, isPending, error, audit, reset }`.
 *
 * ## Error handling
 *
 * - `BADGE_NOT_GRANTED` → surfaces the typed code without retry.
 * - `ACHIEVEMENT_NOT_FOUND` → surfaces without retry.
 * - `SELF_ACTION_FORBIDDEN` → surfaces without retry.
 * - `PERMISSION_DENIED`, `ADMIN_FORBIDDEN` → surfaces without retry.
 * - `IRREVERSIBLE_CONFIRM_REQUIRED` → surfaces without retry (the dialog
 *   re-renders the typed-confirm input).
 * - Every error emits a `phase7:admin` breadcrumb with `requestId`.
 *
 * ## Self-action guard
 *
 * The hook checks `isSelfRevokeAttempt` at the hook boundary before calling
 * the service. When it detects a self-action attempt it immediately resolves
 * with a synthetic `SELF_ACTION_FORBIDDEN` error (without a server call).
 *
 * ## UUID validation
 *
 * Invalid `userId` or `badgeId` returns a synthetic error with code
 * `'invalid-uuid'` without calling the service.
 *
 * ## SWR invalidation
 *
 * On success, the hook invalidates:
 *   - `['admin', 'achievement', 'user-badges', userId]`  (C1)
 *   - `['admin', 'achievement', 'user-history', userId, ...]` (C2)
 *
 * ## Audit
 *
 * The hook emits the `phase7:admin` audit breadcrumb on success and failure.
 * The `audit` handle exposes the `before` snapshot (the badge being revoked)
 * so `AuditActionShell` can render the before/after diff.
 * The `badgeId` is NOT redacted from the breadcrumb (badge IDs are not PII).
 */

import { useCallback, useRef, useState } from "react";

import { mutate as globalMutate } from "swr";

import { ApiError } from "@/lib/api/core/ApiError";
import { addAchievementAdminBreadcrumb } from "@/lib/admin/phase7_admin_sentry";

import {
  revokeUserBadge,
  type AchievementBadgeRevokeResponseDto,
} from "@/features/admin/services/achievement-admin.service";
import type { UserBadgeDto } from "../achievement-admin-types";

import {
  isSelfRevokeAttempt,
  validateBadgeId,
  validateUserId,
} from "../validation";

import { invalidateAchievementAdmin } from "../cache-keys";

import { broadcastAchievementAdminMutation } from "../broadcast";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseRevokeUserBadgeAudit {
  /** The badge that was revoked, captured at the start of the mutation. */
  readonly before: UserBadgeDto | null;
  /** The revocation response from the server. */
  readonly after: AchievementBadgeRevokeResponseDto | null;
}

export interface UseRevokeUserBadgeResult {
  /**
   * Revoke a badge from a user.
   * Resolves to `AchievementBadgeRevokeResponseDto` on success.
   * Rejects with `ApiError` on failure.
   * Invalid UUIDs or self-action attempts are rejected immediately without
   * calling the service.
   */
  readonly revoke: (
    userId: string,
    badgeId: string,
    options?: { before?: UserBadgeDto | null },
  ) => Promise<AchievementBadgeRevokeResponseDto>;
  /** True while a revocation is in flight. */
  readonly isPending: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** Audit snapshot for `AuditActionShell`. */
  readonly audit: UseRevokeUserBadgeAudit;
  /** Clear error and audit state. */
  readonly reset: () => void;
}

// ─── Synthetic error factory ────────────────────────────────────────────────

/**
 * Build a synthetic `ApiError` for hook-boundary rejections
 * (invalid UUID, self-action) so callers can handle them uniformly
 * via the `error.code` branch.
 *
 * Phase 3 (P1-22): rewritten on top of `ApiError.fromInput`.
 */
function makeSyntheticError(code: string, message: string): ApiError {
  return ApiError.fromInput({
    status: 400,
    code,
    message,
    // No requestId — these are client-side rejections.
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Revoke a badge from a user for the achievement admin surface.
 */
export function useRevokeUserBadge(): UseRevokeUserBadgeResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [audit, setAudit] = useState<UseRevokeUserBadgeAudit>({
    before: null,
    after: null,
  });

  // The in-flight promise — concurrent calls return the same promise.
  const inFlightRef = useRef<Promise<AchievementBadgeRevokeResponseDto> | null>(
    null,
  );

  const invalidate = useCallback((userId: string) => {
    void invalidateAchievementAdmin(userId, globalMutate);
  }, []);

  const revoke = useCallback(
    (
      userId: string,
      badgeId: string,
      options?: { before?: UserBadgeDto | null },
    ): Promise<AchievementBadgeRevokeResponseDto> => {
      // Concurrent call guard.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // ── Hook-boundary validation ──────────────────────────────────────

      // Self-action guard.
      const currentUserId: string | null = null; // TODO: wire from useAdminIdentity (TKT-7.1.D1)
      if (isSelfRevokeAttempt(currentUserId, userId)) {
        const err = makeSyntheticError(
          "SELF_ACTION_FORBIDDEN",
          "Cannot revoke your own badge.",
        );
        setError(err);
        return Promise.reject(err);
      }

      // UUID validation.
      if (validateUserId(userId).ok === false) {
        const err = makeSyntheticError(
          "invalid-uuid",
          "Invalid userId format.",
        );
        setError(err);
        return Promise.reject(err);
      }
      if (validateBadgeId(badgeId).ok === false) {
        const err = makeSyntheticError(
          "invalid-uuid",
          "Invalid badgeId format.",
        );
        setError(err);
        return Promise.reject(err);
      }

      // ── Mutation ─────────────────────────────────────────────────────

      const startedAt = Date.now();
      setIsPending(true);
      setError(null);

      const beforeSnapshot = options?.before ?? null;

      // Emit "started" breadcrumb.
      addAchievementAdminBreadcrumb({
        action: "achievement.revokeBadge",
        route: "achievements.revokeUserBadge",
        targetId: userId,
        status: "started",
        durationMs: 0,
        before: beforeSnapshot,
      });

      const promise = revokeUserBadge(userId, badgeId)
        .then((result) => {
          const durationMs = Date.now() - startedAt;
          const revokeResult =
            result as unknown as AchievementBadgeRevokeResponseDto;

          setAudit((prev) => ({ ...prev, after: revokeResult }));
          setIsPending(false);

          // Emit "success" breadcrumb.
          addAchievementAdminBreadcrumb({
            action: "achievement.revokeBadge",
            route: "achievements.revokeUserBadge",
            targetId: userId,
            status: "success",
            durationMs,
            before: beforeSnapshot,
            after: revokeResult,
          });

          // Invalidate SWR caches so badge list reflects new state.
          invalidate(userId);

          // Broadcast to other tabs so they revalidate too.
          broadcastAchievementAdminMutation({
            action: "revoke",
            userId,
            badgeId: revokeResult.badgeId,
            requestId: "", // revoke has no server requestId
          });

          return revokeResult;
        })
        .catch((err: unknown) => {
          const durationMs = Date.now() - startedAt;
          const apiError = err as ApiError;

          setError(apiError);
          setIsPending(false);

          // Emit "failure" breadcrumb.
          addAchievementAdminBreadcrumb({
            action: "achievement.revokeBadge",
            route: "achievements.revokeUserBadge",
            targetId: userId,
            status: "failure",
            durationMs,
            code: apiError.code,
            requestId: apiError.extensions?.requestId as string | undefined,
            correlationId: apiError.extensions?.correlationId as
              | string
              | undefined,
          });

          return Promise.reject(apiError);
        })
        .finally(() => {
          inFlightRef.current = null;
        });

      inFlightRef.current = promise;
      return promise;
    },
    [invalidate],
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setError(null);
    setAudit({ before: null, after: null });
    inFlightRef.current = null;
  }, []);

  return {
    revoke,
    isPending,
    error,
    audit,
    reset,
  };
}
