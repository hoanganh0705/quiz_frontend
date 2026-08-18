

'use client';

import { memo } from 'react';

import { AlertTriangle, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export interface VersionImmutableBannerProps {

onCreateNewDraft: () => void;

isCreating?: boolean;

onDismiss?: () => void;

className?: string;
}

export const VersionImmutableBanner = memo(function VersionImmutableBanner({
onCreateNewDraft,
isCreating = false,
onDismiss,
className,
}: VersionImmutableBannerProps): React.ReactElement {
return (
<div
role="alert"
className={`
        relative flex items-start gap-3 rounded-lg border border-amber-200
        bg-amber-50 p-4 text-amber-900
        dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200
        ${className ?? ''}
      `}
data-testid="version-immutable-banner"
    >
{/* Icon */}
<AlertTriangle
className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
aria-hidden="true"
      />

{/* Content */}
<div className="flex-1 space-y-1">
<p className="text-sm font-medium" data-testid="banner-title">
This version is published
        </p>
<p className="text-sm" data-testid="banner-message">
Create a new draft version to make changes.
        </p>
</div>

{/* Actions */}
<div className="flex items-center gap-2">
<Button
type="button"
size="sm"
variant="outline"
className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
onClick={onCreateNewDraft}
disabled={isCreating}
data-testid="create-draft-btn"
        >
{isCreating ? (
<>
<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
Creating…
            </>
          ) : (
'Create new draft'
          )}
</Button>

{/* Dismiss */}
{onDismiss && (
<button
type="button"
onClick={onDismiss}
className="rounded p-1 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
aria-label="Dismiss"
data-testid="dismiss-btn"
          >
<X className="h-4 w-4" aria-hidden="true" />
</button>
        )}
</div>
</div>
  );
});
