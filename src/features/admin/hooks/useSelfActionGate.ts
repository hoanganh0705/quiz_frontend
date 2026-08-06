'use client';

/**
 * `features/admin/hooks/useSelfActionGate.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.D1.
 *
 * Self-action gate hook.
 *
 * Every destructive admin action that targets a user (role grant, badge
 * revoke, achievement re-evaluate, etc.) MUST hide the control when the
 * target user is the viewer. The server enforces the same rule (every
 * destructive endpoint refuses self-action with a typed error), but the
 * client must hide the control so the server never sees a request it
 * will reject.
 *
 * The hook exposes:
 *
 *   - `isSelfAction(targetUserId)` — boolean check.
 *   - `gate(targetUserId, fn)` — convenience: when the target is self,
 *     returns `null`; otherwise invokes `fn` and returns its result.
 *
 * Defensive hydration handling:
 *
 *   - When `useUser()` is hydrating (user is `null` on the first render),
 *     `isSelfAction` returns `false` (no info to compare against) and
 *     `gate` returns `null`. This prevents a hydration race from ever
 *     enabling a self-action — the worst case is briefly hiding a
 *     legitimate action, which is the safe failure mode.
 */

import { useCallback, useMemo } from 'react';

import { useUser } from '@/features/users/hooks/use-user';

export interface UseSelfActionGate {
  /**
   * Convenience function: returns `true` when the supplied target id
   * is the current viewer's id. Encapsulates the same comparison the
   * `gate` helper performs, so consumers can branch on `isSelfAction`
   * directly without taking the gate path.
   */
  isSelfAction: (targetUserId: string) => boolean;
  /**
   * Convenience gate: invokes `fn` (and returns its result) when the
   * target is not the current viewer; returns `null` when the target
   * is self or the viewer is hydrating.
   */
  gate: <T>(targetUserId: string, fn: () => T) => T | null;
}

export function useSelfActionGate(): UseSelfActionGate {
  const { user } = useUser();

  const currentUserId = user?.userId ?? null;

  const isSelfAction = useCallback(
    (targetUserId: string) => {
      if (currentUserId === null) return false;
      return currentUserId === targetUserId;
    },
    [currentUserId],
  );

  const gate = useCallback(
    <T>(targetUserId: string, fn: () => T): T | null => {
      // Defensive: while the identity is hydrating, suppress the
      // action entirely. We never want a hydration race to enable a
      // self-action before the comparison can be made.
      if (currentUserId === null) return null;
      if (currentUserId === targetUserId) return null;
      return fn();
    },
    [currentUserId],
  );

  return useMemo<UseSelfActionGate>(
    () => ({
      isSelfAction,
      gate,
    }),
    [isSelfAction, gate],
  );
}
