"use client";

import { useMemo } from "react";

import { useAuthSession } from "./use-auth-session";

/**
 * Returns the authenticated user's canonical ID when auth bootstrap has
 * settled in `"authenticated"`, or `null` otherwise.
 *
 * Single source of truth replacing 18 duplicated `currentUser as { id?: string }`
 * extraction blocks across `attempts` and `reviews` hooks.
 */
export function useAuthSessionId(): string | null {
  const { bootstrapState, currentUserId, currentUser } = useAuthSession();

  return useMemo<string | null>(() => {
    if (bootstrapState !== undefined && bootstrapState !== "authenticated") {
      return null;
    }
    if (currentUserId) return currentUserId;
    if (!currentUser) return null;
    const candidate = currentUser as { id?: string; userId?: string };
    return candidate.id ?? candidate.userId ?? null;
  }, [bootstrapState, currentUserId, currentUser]);
}
