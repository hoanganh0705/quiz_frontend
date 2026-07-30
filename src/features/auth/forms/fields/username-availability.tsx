/**
 * `UsernameAvailabilityIndicator` — symmetric counterpart to
 * `EmailAvailabilityIndicator`. Reuses the same copy keys so the two
 * fields render a single, identical `'unavailable'` message — the
 * anti-enumeration contract (TKT-2.1.B3, file header) requires that
 * the wording does not betray whether a username is "taken by a real
 * account" vs "reserved by the platform" vs "blocked".
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.C4.
 */

'use client';

import { Loader2 } from 'lucide-react';

import {
  COPY_KEYS,
  registrationCopy,
  resolveCopy,
} from '@/features/auth/copy/registration-copy';
import type { AvailabilityStatus } from '@/features/auth/errors/register-error-mapper';

export type UsernameAvailabilityIndicatorProps = {
  status: AvailabilityStatus;
  className?: string;
};

export function UsernameAvailabilityIndicator({
  status,
  className,
}: UsernameAvailabilityIndicatorProps) {
  if (status === 'idle' || status === 'silent') {
    return null;
  }

  const text = resolveCopy(
    COPY_KEYS.availability[status as keyof typeof COPY_KEYS.availability]
  );

  const assertive = status === 'rate_limited' || status === 'server';

  // Color policy mirrors the email indicator so the two field rows look
  // symmetric in the layout.
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
