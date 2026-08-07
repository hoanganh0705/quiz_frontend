'use client';

/**
 * `features/admin/achievement-admin/components/AchievementAdminErrorState.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D5 (part c).
 *
 * ## What this component owns
 *
 * - Error state for the achievement admin badge list.
 * - Branch on `error.code` and render the corresponding priority-copy notice.
 * - Surface `RequestIdBanner` when `error.requestId` is present.
 *
 * ## Supported error codes
 *
 * The component renders priority copy for the documented achievement admin
 * error codes:
 *
 *   - `BADGE_NOT_GRANTED`
 *   - `ACHIEVEMENT_NOT_FOUND`
 *   - `ADMIN_FORBIDDEN`
 *   - `GLOBAL_FORBIDDEN`
 *
 * For all other codes it renders a generic fallback notice.
 */

import { AlertCircle } from 'lucide-react';

import { ApiError } from '@/lib/api/core/ApiError';
import {
  getUserCopy,
} from '@/lib/api/error-codes';

export interface AchievementAdminErrorStateProps {
  /** The error to render. */
  error: ApiError | null;
}

/**
 * Error state for the achievement admin badge list.
 *
 * Renders the priority-copy notice for documented achievement admin error codes.
 * Falls back to a generic notice for non-documented codes.
 * Renders `RequestIdBanner` when `error.requestId` is present.
 */
export function AchievementAdminErrorState({
  error,
}: AchievementAdminErrorStateProps) {
  if (error === null) return null;

  // getUserCopy() returns { title, body, toast } from USER_COPY.
  // The overlay in buildUserCopy() means getUserCopy(code) returns the
  // Story 7.8 priority copy for all achievement-admin codes.
  const copy = getUserCopy(error.code);
  const hasRequestId = Boolean(error.requestId);

  return (
    <div
      className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center"
      role="alert"
      aria-live="polite"
      data-testid="achievement-admin-error-state"
      data-error-code={error.code}
    >
      <AlertCircle
        className="mb-2 h-8 w-8 text-destructive/70"
        aria-hidden="true"
      />
      <p
        className="text-sm text-muted-foreground"
        data-testid="achievement-admin-error-state-copy"
      >
        {copy.body}
      </p>
      {hasRequestId && (
        <p
          className="mt-2 font-mono text-xs text-muted-foreground/60"
          data-testid="achievement-admin-error-state-request-id"
        >
          Request ID: {error.requestId}
        </p>
      )}
    </div>
  );
}
