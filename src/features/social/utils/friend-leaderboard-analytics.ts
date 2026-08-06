/**
 * `friend-leaderboard-analytics.ts` — Analytics wrapper for the
 * Friend Leaderboard row tap event.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.G1.
 *
 * Centralised emission so `FriendLeaderboardRow` only depends on a
 * typed function. Tests can replace the implementation via
 * `vi.spyOn(friendLeaderboardAnalytics, '...')`.
 *
 * ## Privacy
 *
 * The payload intentionally includes only `userId` and `period`.
 * Internal ids (`followId`, `friendshipId`) are NEVER serialised
 * — see the cross-batch invariant
 * "Internal ids must not appear in URLs, localStorage, or
 * analytics payloads" and the Phase 6 Risks line 49–54.
 */

export interface FriendLeaderboardRowTappedEvent {
  /** The user whose row was tapped. */
  userId: string;
  /** The analytics period the leaderboard was loaded for. */
  period: "week" | "month" | "all";
}

/**
 * Emit a "row tapped" analytics event for the Friend Leaderboard.
 *
 * The default implementation delegates to the global analytics
 * provider when one is configured; it is a no-op in tests and in
 * environments without the analytics provider. Server-side calls
 * are no-ops (the row is only rendered client-side after the
 * SWR load resolves).
 */
export function trackFriendLeaderboardRowTapped(
  event: FriendLeaderboardRowTappedEvent,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const g = window as unknown as {
    analytics?: {
      track?: (name: string, payload: Record<string, unknown>) => void;
    };
  };
  if (g.analytics?.track !== undefined) {
    g.analytics.track("friend_leaderboard_row_tapped", { ...event });
  }
}