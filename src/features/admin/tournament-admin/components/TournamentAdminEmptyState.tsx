

'use client';

import { Button } from '@/components/ui/Button';

import type { TournamentAdminFilters } from '../admin-tournament-types';

export interface TournamentAdminEmptyStateProps {

filter: TournamentAdminFilters;

onClearFilter?: () => void;
}

function isFiltered(filter: TournamentAdminFilters): boolean {
return (
(filter.status?.length ?? 0) > 0 || filter.search.length > 0
  );
}

export function TournamentAdminEmptyState({
filter,
onClearFilter,
}: TournamentAdminEmptyStateProps): React.ReactElement {
if (isFiltered(filter)) {
return (
<div
className="flex flex-col items-center justify-center py-12 text-center"
data-testid="tournament-admin-empty-filtered"
      >
<svg
className="mb-3 h-10 w-10 text-muted-foreground"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
aria-hidden="true"
        >
<path
strokeLinecap="round"
strokeLinejoin="round"
strokeWidth={1.5}
d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
</svg>
<p
className="mb-1 text-sm font-medium text-foreground"
data-testid="tournament-admin-empty-filtered-title"
        >
No tournaments match your filter
        </p>
<p
className="mb-4 text-xs text-muted-foreground"
data-testid="tournament-admin-empty-filtered-body"
        >
Try adjusting your search or status filter.
        </p>
{onClearFilter ? (
<Button
type="button"
variant="outline"
size="sm"
onClick={onClearFilter}
data-testid="tournament-admin-empty-filtered-clear"
          >
Clear filter
          </Button>
        ) : null}
</div>
    );
  }

return (
<div
className="flex flex-col items-center justify-center py-12 text-center"
data-testid="tournament-admin-empty"
    >
<svg
className="mb-3 h-10 w-10 text-muted-foreground"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
aria-hidden="true"
      >
<path
strokeLinecap="round"
strokeLinejoin="round"
strokeWidth={1.5}
d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
</svg>
<p
className="mb-1 text-sm font-medium text-foreground"
data-testid="tournament-admin-empty-title"
      >
No tournaments yet
      </p>
<p
className="text-xs text-muted-foreground"
data-testid="tournament-admin-empty-body"
      >
Create your first tournament to get started.
      </p>
</div>
  );
}
