'use client';

/**
 * `features/admin/ranking-admin/components/RankingCooldownNotice.tsx`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.D2.
 *
 * ## What this component owns
 *
 * A non-blocking alert with a countdown timer that renders when a cooldown is active.
 * Consumed by `RecalculateRankingPanel` and `PeriodResetPanel`.
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export interface RankingCooldownNoticeProps {
  /**
   * Seconds remaining until the cooldown expires. `null` when no cooldown
   * is active — the component renders nothing.
   */
  cooldownRemaining: number | null;
}

/**
 * Format seconds into a human-readable countdown string.
 *
 * @param seconds - Total seconds remaining.
 * @returns Formatted string: "Xm Ys" or "Xs" when under 60 seconds.
 */
function formatCountdown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Shared component rendering a cooldown notice with a live countdown.
 *
 * Renders `null` when `cooldownRemaining` is `null`.
 *
 * The component uses a derived-state pattern: instead of syncing
 * `displaySeconds` to the prop on every change, it tracks a tick counter
 * and computes `displaySeconds = cooldownRemaining - tickCount` on each
 * render. This avoids the setState-in-effect anti-pattern.
 */
export function RankingCooldownNotice({ cooldownRemaining }: RankingCooldownNoticeProps) {
  // Track the number of ticks since the cooldown started.
  const [tickCount, setTickCount] = useState(0);

  // Tick down every second while a cooldown is active.
  useEffect(() => {
    if (cooldownRemaining === null) return;

    const interval = setInterval(() => {
      setTickCount((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Reset tick count when cooldown changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTickCount(0);
  }, [cooldownRemaining]);

  // No cooldown — render nothing.
  if (cooldownRemaining === null) {
    return null;
  }

  const displaySeconds = Math.max(0, cooldownRemaining - tickCount);

  return (
    <div
      data-testid="ranking-cooldown-notice"
      role="alert"
      className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
    >
      <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Cooldown active. You can retry in{' '}
        <span data-testid="ranking-cooldown-countdown" className="font-mono font-semibold">
          {formatCountdown(displaySeconds)}
        </span>
        .
      </span>
    </div>
  );
}
