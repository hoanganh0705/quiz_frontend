"use client";

/**
 * `ActivityRateLimitNotice` — Explicit rate-limit notice for the
 * Story 6.4 per-user activity stream.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B3.
 *
 * ## What this component owns
 *
 * The single rate-limit notice for the activity stream. The
 * component:
 *
 *   - Renders the documented copy ("Activity is temporarily
 *     rate-limited. Try again in N seconds.") with a countdown.
 *   - Calls `onCooldownComplete` when the cooldown expires (via
 *     a `setTimeout`).
 *   - Is intentionally separate from `ActivityErrorState` (TKT-6.4.B4)
 *     — the rate-limit branch is a dedicated surface because the
 *     user expects a "try again in N seconds" CTA, not a generic
 *     error.
 *
 * ## Why an explicit notice
 *
 * The rate-limit error is the most actionable error the activity
 * stream surfaces. The user can either wait for the cooldown or
 * navigate away. A generic error state would force the user to
 * interpret the typed `ApiError.code` themselves; the explicit
 * notice gives them the resolved information.
 *
 * ## Why a Client Component
 *
 * The countdown uses `setTimeout` and `useEffect` to drive the
 * "try again in N seconds" copy. The component is otherwise
 * presentational.
 *
 * ## SSR-safety
 *
 * The component uses `useEffect` (which never runs on the server)
 * so the initial render is identical on server and client. The
 * countdown updates only after mount.
 */

import { useEffect, useState, type ReactElement } from "react";

interface ActivityRateLimitNoticeProps {
  /**
   * The number of seconds the user must wait before the next
   * activity request can be issued. The component renders a
   * countdown from this value down to `0` and calls
   * `onCooldownComplete` when the countdown reaches `0`.
   */
  cooldownSeconds: number;
  /**
   * Optional callback invoked when the cooldown reaches `0`. The
   * caller can use the callback to re-enable pagination or to
   * dismiss the notice. When omitted, the notice renders the
   * generic "You can try again now" copy once the countdown ends.
   */
  onCooldownComplete?: () => void;
}

export function ActivityRateLimitNotice({
  cooldownSeconds,
  onCooldownComplete,
}: ActivityRateLimitNoticeProps): ReactElement {
  // The `secondsRemaining` state is initialised from the prop and
  // decremented by `useEffect` on a 1-second cadence. The state is
  // clamped to `0` so a negative prop or a stale re-render never
  // displays a negative countdown.
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    Math.max(0, Math.floor(cooldownSeconds)),
  );

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1_000);
    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  useEffect(() => {
    if (secondsRemaining === 0 && onCooldownComplete !== undefined) {
      onCooldownComplete();
    }
  }, [secondsRemaining, onCooldownComplete]);

  const copy =
    secondsRemaining > 0
      ? `Activity is temporarily rate-limited. Try again in ${secondsRemaining} seconds.`
      : "You can try again now.";

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="activity-rate-limit-notice"
      data-seconds-remaining={secondsRemaining}
      data-cooldown-complete={secondsRemaining === 0 ? "true" : "false"}
      className="flex flex-col gap-2 p-4 rounded-md border border-amber-300 bg-amber-50 text-amber-900"
    >
      <p className="text-sm font-medium">{copy}</p>
    </div>
  );
}
