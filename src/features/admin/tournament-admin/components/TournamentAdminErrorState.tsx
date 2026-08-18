

'use client';

import { Button } from '@/components/ui/Button';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';
import type { ApiError } from '@/lib/api/core/ApiError';

export interface TournamentAdminErrorStateProps {

error: ApiError;

onRetry: () => void;
}

export function TournamentAdminErrorState({
error,
onRetry,
}: TournamentAdminErrorStateProps): React.ReactElement {
return (
<div
className="flex flex-col items-center justify-center py-12 text-center"
data-testid="tournament-admin-error-state"
role="alert"
    >
<svg
className="mb-3 h-10 w-10 text-destructive"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
aria-hidden="true"
      >
<path
strokeLinecap="round"
strokeLinejoin="round"
strokeWidth={1.5}
d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
</svg>

<p
className="mb-1 text-sm font-medium text-foreground"
data-testid="tournament-admin-error-state-title"
      >
Failed to load tournaments
      </p>

<p
className="mb-4 text-xs text-muted-foreground"
data-testid="tournament-admin-error-state-code"
      >
{error.code}
</p>

{error.requestId.length > 0 ? (
<div className="mb-4 w-full max-w-sm">
<RequestIdBanner error={error} />
</div>
      ) : null}

<Button
type="button"
variant="default"
size="sm"
onClick={onRetry}
data-testid="tournament-admin-error-state-retry"
      >
Try again
      </Button>
</div>
  );
}
