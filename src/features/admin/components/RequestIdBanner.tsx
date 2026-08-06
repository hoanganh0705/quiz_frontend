'use client';

/**
 * `features/admin/components/RequestIdBanner.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C4.
 *
 * Renders a banner that surfaces the failure's `requestId` and
 * `correlationId` so the admin can correlate a destructive-action
 * failure with backend tooling.
 *
 * Invariants:
 *
 *   - When `error === null`, the banner renders `null` (no empty
 *     banner shell).
 *   - When `error.requestId` is present, the banner renders both
 *     `requestId` and (if present) `correlationId`.
 *   - The banner never renders tokens, raw payloads, or any other
 *     server-side detail. Only the two IDs are surfaced.
 */

import { AlertCircle } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';
import { ApiError } from '@/lib/api/core/ApiError';

export interface RequestIdBannerProps {
  error: ApiError | null;
}

export function RequestIdBanner({ error }: RequestIdBannerProps) {
  if (error === null) {
    return null;
  }

  const requestId = error.requestId;
  // The backend always provides `correlationId` explicitly when it
  // differs from `requestId`. The ApiError getter falls back to
  // `requestId` for forward compatibility, but we only want to render
  // the correlation-id row when the backend explicitly supplied it.
  // We probe the raw extension payload via a typed cast because
  // `data` is private on the class.
  const extensions =
    (error as unknown as {
      data?: { extensions?: { correlationId?: string } };
    }).data?.extensions;
  const hasExplicitCorrelationId =
    typeof extensions?.correlationId === 'string';

  if (!requestId) {
    return null;
  }
  const correlationId = error.correlationId;

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="admin-request-id-banner"
      className={cn(
        'flex w-full items-start gap-3 rounded-md border',
        'border-destructive/30 bg-destructive/5 px-4 py-3',
        'text-sm text-destructive',
      )}
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 flex-shrink-0"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <span className="font-semibold">Action failed</span>
        <span data-testid="admin-request-id-banner-request-id">
          Request ID:{' '}
          <span className="font-mono text-xs">{requestId}</span>
        </span>
        {correlationId && hasExplicitCorrelationId ? (
          <span data-testid="admin-request-id-banner-correlation-id">
            Correlation ID:{' '}
            <span className="font-mono text-xs">{correlationId}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
