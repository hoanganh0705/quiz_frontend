'use client';

/**
 * `app/admin/error.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.A3.
 *
 * ## Purpose
 *
 * Next.js app-router error boundary for the entire `/admin/*` route group.
 * Catches any uncaught error thrown by the admin shell or its children and
 * renders a restart-safe error notice.  The `reset()` function from
 * `useEffect` is wired to the error boundary so the user can attempt recovery
 * without a full page reload.
 *
 * ## What it does NOT do
 *
 * - Does not distinguish between permission denied and system errors
 *   (that is `PermissionDeniedNotice`, rendered by `AdminRoleGuard`).
 * - Does not check the feature flag (that is `AdminShellUnavailable`).
 * - Does not fetch admin resource endpoints.
 *
 * The boundary is intentionally thin — it surfaces a generic error state so
 * the admin shell never renders a blank white screen.  Detailed errors
 * (permission denied, not found, etc.) are rendered by the appropriate
 * boundary component inside the shell.
 */

import { useEffect } from 'react';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Attempt to recover automatically on the next render.
  useEffect(() => {
    const timer = setTimeout(reset, 30_000);
    return () => clearTimeout(timer);
  }, [reset]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-6"
      data-testid="admin-error-boundary"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle
            className="h-6 w-6 text-destructive"
            aria-hidden="true"
          />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The admin console encountered an unexpected error. Your session is
            safe. You can retry or sign out and sign back in.
          </p>
        </div>
        {error?.digest ? (
          <p className="text-xs text-muted-foreground font-mono break-all">
            Error ID: {error.digest}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="gap-2"
          >
            Back to home
          </Button>
          <Button
            onClick={reset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
