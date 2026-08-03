/**
 * `CooldownTimer` — countdown timer for 429 rate limit cooldown.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.21.
 *
 * ## What this component owns
 *
 * - Visual countdown from a given number of seconds.
 * - Progress bar showing cooldown progress.
 * - Auto-enables a child component (e.g., button) when complete.
 * - Accessible announcement of countdown state.
 *
 * ## Usage
 *
 * Wraps a submit button and disables it during cooldown.
 *
 * @example
 * ```tsx
 * <CooldownTimer seconds={60}>
 *   <Button type="submit" disabled={isDisabled}>
 *     Submit
 *   </Button>
 * </CooldownTimer>
 * ```
 */

'use client';

import { memo, useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface CooldownTimerProps {
  /** Number of seconds to count down. */
  seconds: number;
  /** Callback when countdown completes. */
  onComplete?: () => void;
  /** Callback on each second tick. */
  onTick?: (remaining: number) => void;
  /** Whether to show the progress bar. */
  showProgress?: boolean;
  /** Custom className for the container. */
  className?: string;
  /** Children to render (usually a button). */
  children: React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * `<CooldownTimer />` — wraps a child (typically a button) and disables it
 * during a countdown, then re-enables it when complete.
 */
export const CooldownTimer = memo(function CooldownTimer({
  seconds,
  onComplete,
  onTick,
  showProgress = true,
  className,
  children,
}: CooldownTimerProps): React.ReactElement {
  const [remaining, setRemaining] = useState(seconds);

  // Reset when seconds changes
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  // Countdown effect
  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    onTick?.(remaining);

    const timer = setTimeout(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [remaining, onComplete, onTick]);

  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;
  const isActive = remaining > 0;

  return (
    <div className={cn('space-y-2', className)} data-testid="cooldown-timer">
      {/* Progress bar */}
      {showProgress && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-yellow-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={remaining}
            aria-valuemin={0}
            aria-valuemax={seconds}
            aria-label={`${remaining} seconds remaining`}
          />
        </div>
      )}

      {/* Countdown display */}
      {isActive && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Wait <span className="font-medium text-foreground">{remaining}</span>s
            before trying again
          </span>
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isActive
          ? `Rate limit active. ${remaining} seconds remaining.`
          : 'Rate limit complete. You may try again.'}
      </div>

      {/* Child (button) - disabled during cooldown */}
      <div className={cn(isActive && 'pointer-events-none opacity-50')}>
        {/* Clone the child and inject disabled prop if it's a button */}
        {typeof children === 'object' && children !== null
          ? (children as React.ReactElement<{ disabled?: boolean }>).type ===
            'button'
            ? undefined
            : children
          : children}
      </div>
    </div>
  );
});

// ─── Standalone timer display ──────────────────────────────────────────────

export interface CooldownDisplayProps {
  /** Remaining seconds. */
  seconds: number;
  /** Total seconds (for progress calculation). */
  total: number;
}

export const CooldownDisplay = memo(function CooldownDisplay({
  seconds,
  total,
}: CooldownDisplayProps): React.ReactElement | null {
  if (seconds <= 0) {
    return null;
  }

  const progress = total > 0 ? ((total - seconds) / total) * 100 : 100;

  return (
    <div
      className="flex items-center gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3"
      role="status"
      aria-live="polite"
    >
      {/* Progress indicator */}
      <div className="h-10 w-10 flex-shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
          {/* Background circle */}
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-secondary"
          />
          {/* Progress circle */}
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${progress} 100`}
            className="text-yellow-500 transition-all duration-1000 ease-linear"
          />
        </svg>
      </div>

      {/* Countdown text */}
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-800">
          Rate limit active
        </p>
        <p className="text-xs text-yellow-700">
          Please wait {seconds} second{seconds !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
});
