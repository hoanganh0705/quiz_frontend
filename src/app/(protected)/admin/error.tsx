'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

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
          onClick={() => router.push('/')}
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
