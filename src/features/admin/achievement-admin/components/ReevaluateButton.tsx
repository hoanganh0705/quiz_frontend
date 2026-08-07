'use client';

/**
 * `features/admin/achievement-admin/components/ReevaluateButton.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D1.
 *
 * ## What this component owns
 *
 * - Render the Re-evaluate button for a target user.
 * - Drive the button label and disabled state from the lifecycle
 *   returned by `useReevaluateUserAchievements`.
 * - Surface `REVAL_RUNNING` via the priority-copy notice.
 * - Gate on `usePermission('achievement_manage')`.
 *
 * ## Lifecycle → button state
 *
 *   - `'idle'`       → primary button, label **Re-evaluate achievements**
 *   - `'running'`    → secondary button, label **Re-evaluation running…**, spinner, disabled
 *   - `'completed'`  → primary button, label **Re-evaluate again**
 *   - `'failed'`     → primary button, label **Retry re-evaluation**
 */

import { useCallback, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/loading-states/LoadingSpinner';
import { ApiError } from '@/lib/api/core/ApiError';
import { getUserCopy } from '@/lib/api/error-codes';

import { usePermission } from '@/features/admin/hooks/usePermission';

import { useReevaluateUserAchievements } from '../hooks';

export interface ReevaluateButtonProps {
  /** The user being re-evaluated. */
  userId: string;
  /** Optional callback fired when lifecycle transitions to `'completed'`. */
  onCompleted?: () => void;
}

/**
 * Re-evaluate button for the achievement admin surface.
 *
 * Renders `PermissionDeniedNotice` when `achievement_manage` is denied.
 */
export function ReevaluateButton({ userId, onCompleted }: ReevaluateButtonProps) {
  const { allowed } = usePermission('achievement_manage');
  const { reevaluate, lifecycle, isPending, error, reset } =
    useReevaluateUserAchievements(userId);

  // Fire `onCompleted` when lifecycle reaches `'completed'`.
  useEffect(() => {
    if (lifecycle === 'completed') {
      onCompleted?.();
    }
  }, [lifecycle, onCompleted]);

  // Reset lifecycle when the component unmounts (navigation away).
  useEffect(() => {
    return () => {
      reset();
    };
    // Only reset on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Permission gate ──────────────────────────────────────────────────────

  if (allowed === false) {
    return <PermissionDeniedNoticeInline variant="control" />;
  }

  if (allowed === null) {
    // Permission lookup in flight — render disabled button to avoid FOUC.
    return (
      <Button variant="secondary" disabled>
        <LoadingSpinner size="sm" />
        Checking permissions…
      </Button>
    );
  }

  // ── Button label ──────────────────────────────────────────────────────────

  const isRunning = lifecycle === 'running';
  const isCompleted = lifecycle === 'completed';
  const isFailed = lifecycle === 'failed';

  const label =
    lifecycle === 'idle'
      ? 'Re-evaluate achievements'
      : lifecycle === 'running'
        ? 'Re-evaluation running…'
        : lifecycle === 'completed'
          ? 'Re-evaluate again'
          : 'Retry re-evaluation';

  const variant = isRunning ? 'secondary' : 'default';

  // ── REVAL_RUNNING notice ─────────────────────────────────────────────────

  const showRevalRunningNotice =
    error !== null && error.code === 'REVAL_RUNNING';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {showRevalRunningNotice && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
          data-testid="reevaluate-reval-running-notice"
        >
          {getUserCopy(error.code).body}
        </p>
      )}

      <Button
        variant={variant}
        disabled={isRunning || isPending}
        onClick={() => {
          if (!isRunning && !isPending) {
            reevaluate().catch(() => {
              // Error is captured in hook state; rendered below.
            });
          }
        }}
        data-testid="reevaluate-button"
      >
        {isRunning && <LoadingSpinner size="sm" />}
        {label}
      </Button>

      {error !== null && error.code !== 'REVAL_RUNNING' && (
        <RequestIdBannerInline error={error} />
      )}
    </div>
  );
}

// ─── Inline primitives ───────────────────────────────────────────────────────

function PermissionDeniedNoticeInline({
  variant,
}: {
  variant: 'control' | 'route';
}) {
  return (
    <p
      className="text-sm text-muted-foreground"
      data-testid="permission-denied-notice"
    >
      {variant === 'control'
        ? 'This action is not available for your account.'
        : 'This page is restricted to administrators.'}
    </p>
  );
}

function RequestIdBannerInline({ error }: { error: ApiError }) {
  const requestId = error.requestId;
  if (!requestId) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="admin-request-id-banner"
      className="mt-1 rounded border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground"
    >
      <span className="font-semibold">Request ID: </span>
      {requestId}
    </div>
  );
}
