/**
 * `TournamentAdminItem` — a single tournament admin row.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.E1.
 *
 * ## What this component renders
 *
 * One table-like row for a tournament admin list:
 *
 *   - Title + description (left)
 *   - `TournamentStatusBadge` pill (centre-left)
 *   - Start / end window (centre-right)
 *   - View-link + action menu (right)
 *
 * Clicking the row (or the "View" affordance) opens the tournament
 * detail in a new tab using the Phase 5 pattern
 * (`/tournaments/{id}`). The action menu (`TournamentAdminActionMenu`)
 * is isolated from the row click so selecting Edit / Delete never
 * navigates away.
 *
 * ## No service calls
 *
 * This component is purely presentational. It receives a fully-hydrated
 * `TournamentDto` and delegates all mutations to the parent's callbacks.
 */

'use client';

import { memo } from 'react';
import { ExternalLink } from 'lucide-react';

import { TournamentStatusBadge } from '@/features/tournaments/components/TournamentStatusBadge';
import type { TournamentStatus } from '@/features/tournaments/types';

import { TournamentAdminActionMenu } from './TournamentAdminActionMenu';
import type { TournamentDto } from '../admin-tournament-types';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface TournamentAdminItemProps {
  /** The tournament to render in this row. */
  tournament: TournamentDto;
  /** Invoked when the admin selects **Edit** in the action menu. */
  onEdit: (id: string) => void;
  /** Invoked when the admin selects **Delete** in the action menu. */
  onDelete: (id: string) => void;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// ─── Component ──────────────────────────────────────────────────────────────

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
