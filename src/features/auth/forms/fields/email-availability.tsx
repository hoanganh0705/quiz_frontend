/**
 * `EmailAvailabilityIndicator` — renders the email field's availability
 * state without leaking account existence.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.C3.
 *
 * The component does NOT call the backend. It consumes the result of
 * `useCheckEmail` (TKT-2.1.C1) and renders the canonical copy keys from
 * `registration-copy.ts` (TKT-2.1.B3). Every status maps to a single
 * key; there are no inline strings and no per-status branching that
 * could become an oracle.
 *
 * `aria-live` policy:
 *   - `'polite'` for non-error states (`idle`, `checking`, `available`,
 *     `unavailable`, `silent`) because those are routine updates a
 *     screen-reader user can listen to after their current task.
 *   - `'assertive'` for `'rate_limited'` and `'server'` because those
 *     are temporarily-blocking conditions the user should not miss
 *     while still typing.
 *
 * The component never collapses the field into a disabled state; the
 * input stays editable in every status so a user can recover from
 * `'rate_limited'` or `'server'` by submitting.
 */

'use client';

import { Loader2 } from 'lucide-react';

import {
  COPY_KEYS,
  registrationCopy,
  resolveCopy,
} from '@/features/auth/copy/registration-copy';
import type { AvailabilityStatus } from '@/features/auth/errors/register-error-mapper';

export type EmailAvailabilityIndicatorProps = {
  status: AvailabilityStatus;
  /** Optional class for the indicator row. */
  className?: string;
};

export function EmailAvailabilityIndicator({
  status,
  className,
}: EmailAvailabilityIndicatorProps) {
  if (status === 'idle' || status === 'silent') {
    return null;
  }

  const text = resolveCopy(
    COPY_KEYS.availability[status as keyof typeof COPY_KEYS.availability]
  );

  const assertive = status === 'rate_limited' || status === 'server';

  // Colour policy mirrors the surrounding design-system tokens. The
  // `text-destructive` class on error states matches the existing
  // signup page convention (line 158–161, line 191–195).
  const colorClass =
    status === 'available'
      ? 'text-emerald-600 dark:text-emerald-400'
      : status === 'unavailable'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-destructive';

  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      className={['flex items-center gap-2 text-xs', colorClass, className]
        .filter(Boolean)
        .join(' ')}
    >
      {status === 'checking' ? (
        <Loader2
          className="h-3 w-3 animate-spin"
          aria-hidden="true"
        />
      ) : null}
      <span aria-hidden={status === 'checking' ? 'true' : undefined}>
        {text || registrationCopy.availability.silent}
      </span>
    </div>
  );
}
