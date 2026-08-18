

'use client';

import { memo } from 'react';
import { ExternalLink } from 'lucide-react';

import { TournamentStatusBadge } from '@/features/tournaments/components/TournamentStatusBadge';
import type { TournamentStatus } from '@/features/tournaments/types';

import { TournamentAdminActionMenu } from './TournamentAdminActionMenu';
import type { TournamentDto } from '../admin-tournament-types';

export interface TournamentAdminItemProps {

tournament: TournamentDto;

onEdit: (id: string) => void;

onDelete: (id: string) => void;
}

function formatDateTime(iso: string): string {
return new Intl.DateTimeFormat('en-GB', {
day: '2-digit',
month: 'short',
hour: '2-digit',
minute: '2-digit',
  }).format(new Date(iso));
}

export const TournamentAdminItem = memo(
function TournamentAdminItem({
tournament,
onEdit,
onDelete,
  }: TournamentAdminItemProps): React.ReactElement {
const { tournamentId, title, status, startAt, endAt } = tournament;

const detailUrl = `/tournaments/${tournamentId}`;

return (
<div
className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
data-testid="tournament-admin-item"
data-tournament-id={tournamentId}
data-tournament-status={status}
      >
{/* Title + description */}
<a
href={detailUrl}
target="_blank"
rel="noopener noreferrer"
className="flex-1 min-w-0"
data-testid="tournament-admin-item-link"
        >
<p
className="truncate text-sm font-medium text-foreground hover:underline"
data-testid="tournament-admin-item-title"
          >
{title}
</p>
<p
className="truncate text-xs text-muted-foreground"
data-testid="tournament-admin-item-window"
          >
{startAt && endAt
? `${formatDateTime(startAt)} – ${formatDateTime(endAt)}`
: '—'}
</p>
</a>

{/* Status pill */}
<div data-testid="tournament-admin-item-status">
<TournamentStatusBadge status={status as TournamentStatus} />
</div>

{/* View link */}
<a
href={detailUrl}
target="_blank"
rel="noopener noreferrer"
className="hidden shrink-0 text-muted-foreground hover:text-foreground sm:block"
aria-label={`View ${title} details`}
data-testid="tournament-admin-item-view-link"
        >
<ExternalLink className="h-4 w-4" aria-hidden="true" />
</a>

{/* Action menu */}
<div className="shrink-0">
<TournamentAdminActionMenu
tournament={tournament}
onEdit={onEdit}
onDelete={onDelete}
          />
</div>
</div>
    );
  },
);
