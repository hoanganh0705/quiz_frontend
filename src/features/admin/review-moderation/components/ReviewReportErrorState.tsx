'use client';

/**
 * `ReviewReportErrorState` — error state for the review-moderation
 * queue.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.D3.
 *
 * Surfaces the typed `ApiError.code`, the user-facing copy for the
 * error category, and a retry CTA that invokes the parent's
 * `onRetry` callback. The component is purely presentational: it
 * never fetches data, never imports a service, and never mutates
 * state. The parent (`ReviewReportsList`) wires the retry CTA to
 * `mutate()` from `useReviewReports`.
 *
 * The component surfaces `error.requestId` via the
 * `RequestIdBanner` primitive so the admin can correlate the
 * failure with backend tooling.
 *
 * Cross-batch invariants:
 *   - The component never imports a service.
 *   - The retry CTA is rendered as a button (`onRetry`); the
 *     component never retries on its own.
 *   - The component renders the typed error code from
 *     `error.code` (or `'UNKNOWN'` when missing) so admins can
 *     tell, at a glance, whether the failure is permission,
 *     network, or backend-side.
 */

import { AlertCircle } from 'lucide-react';

import { ApiError } from '@/lib/api/core/ApiError';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ReviewReportErrorStateProps {
  /** The typed `ApiError` to surface. */
  error: ApiError;
  /**
   * Retry CTA callback. Wired to the parent's `mutate()` from
   * `useReviewReports` (TKT-7.5.C1) or to a manual
   * `useReviewReports` re-read.
   */
  onRetry: () => void;
  /** Optional className forwarded to the outer wrapper. */
  className?: string;
}

// ─── Copy ───────────────────────────────────────────────────────────────────

/**
 * Map the documented error categories to user-facing copy. The
 * mapping is exhaustive of the codes the queue surfaces; unknown
 * codes fall back to the documented generic copy.
 */
const COPY: Readonly<
  Record<
    'forbidden' | 'not-found' | 'rate-limit' | 'network' | 'server' | 'unknown',
    { title: string; description: string }
  >
> = Object.freeze({
  forbidden: {
    title: 'Permission denied',
    description:
      'Your account no longer has permission to read review reports. Refresh the page or contact an administrator.',
  },
  'not-found': {
    title: 'Reports not available',
    description:
      'The review-report endpoint is unavailable. Refresh the page and try again.',
  },
  'rate-limit': {
    title: 'Too many requests',
    description:
      'You are sending requests too quickly. Wait a moment and try again.',
  },
  network: {
    title: 'Connection lost',
    description:
      'We could not reach the moderation service. Check your connection and try again.',
  },
  server: {
    title: 'Server error',
    description:
      'The moderation service is having trouble. Try again in a moment.',
  },
  unknown: {
    title: 'Could not load reports',
    description:
      'An unexpected error occurred while loading review reports. Try again.',
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Classify an `ApiError.code` into a copy key. Returns
 * `'unknown'` when the code is missing or not in the documented
 * mapping.
 */
function classifyErrorCode(code: string | undefined | null): keyof typeof COPY {
  if (typeof code !== 'string' || code.length === 0) return 'unknown';
  if (code === 'GLOBAL_FORBIDDEN' || code === 'PERMISSION_DENIED') {
    return 'forbidden';
  }
  if (code === 'REVIEW_NOT_FOUND' || code === 'GLOBAL_NOT_FOUND') {
    return 'not-found';
  }
  if (code === 'GLOBAL_RATE_LIMITED') return 'rate-limit';
  if (
    code === 'GLOBAL_NETWORK_ERROR' ||
    code === 'GLOBAL_TIMEOUT' ||
    code === 'NETWORK_ERROR'
  ) {
    return 'network';
  }
  if (code === 'GLOBAL_INTERNAL_ERROR' || code.startsWith('GLOBAL_5')) {
    return 'server';
  }
  return 'unknown';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewReportErrorState({
  error,
  onRetry,
  className,
}: ReviewReportErrorStateProps): React.ReactElement {
  const copyKey = classifyErrorCode(error.code);
  const copy = COPY[copyKey];
  const code = typeof error.code === 'string' && error.code.length > 0
    ? error.code
    : 'UNKNOWN';

  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="review-report-error-state"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
        <p className="font-semibold">{copy.title}</p>
      </div>
      <p>{copy.description}</p>
      <p className="font-mono text-xs text-red-700">
        Error code: <span className="font-semibold">{code}</span>
      </p>
      <RequestIdBanner error={error} />
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-red-400 bg-white px-3 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        data-testid="review-report-error-state-retry"
      >
        Try again
      </button>
    </div>
  );
}
