/**
 * `TournamentCascadeNotice` — cascade scope notice for the delete dialog.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D4.
 *
 * ## What this component renders
 *
 * A read-only notice that displays the cascade impact of deleting a
 * tournament: how many participants, rounds, and leaderboards will be
 * affected. It is always rendered at the top of the delete dialog so
 * the admin understands the scope before confirming.
 *
 * ## Loading state
 *
 * When `isLoading` is `true` the component renders a short skeleton
 * so the dialog height is stable while the cascade fetch is in flight.
 * A `cascade` of `null` (no data yet) renders the documented stable
 * "cascade data unavailable" message rather than a skeleton — the
 * parent drives the loading state independently from whether the fetch
 * has been attempted.
 *
 * ## Cascade counts
 *
 * Each count is rendered as a bullet point. Nullable counts are
 * displayed as `N` when a `number` and as `—` when `null`. The
 * `hasMoreParticipants` field (from the paginated stats response)
 * appends a `"+\` suffix when `true`.
 */

'use client';

import type { TournamentCascadeDto } from '../admin-tournament-types';

export interface TournamentCascadeNoticeProps {
  /** Cascade impact counts from `useTournamentCascade`. `null` means no data yet. */
  cascade: TournamentCascadeDto | null;
  /** `true` while `useTournamentCascade` is in flight. */
  isLoading: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function CountLabel({ value }: { value: number | null }): React.ReactElement {
  const display = value === null ? '—' : value;
  return (
    <span data-testid="tournament-cascade-notice-count">{display}</span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TournamentCascadeNotice({
  cascade,
  isLoading,
}: TournamentCascadeNoticeProps): React.ReactElement {
  if (isLoading) {
    return (
      <div
        className="space-y-2"
        data-testid="tournament-cascade-notice-loading"
        aria-busy="true"
      >
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (cascade === null) {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-testid="tournament-cascade-notice-unavailable"
      >
        Cascade data is unavailable. Deleting the tournament may affect
        associated records.
      </p>
    );
  }

  return (
    <div
      className="space-y-1 text-xs text-muted-foreground"
      data-testid="tournament-cascade-notice"
    >
      <p className="mb-2 font-semibold text-foreground">
        This action affects:
      </p>
      <ul className="list-inside list-disc space-y-1">
        <li data-testid="tournament-cascade-notice-participants">
          <CountLabel value={cascade.participants} />
          {cascade.hasMoreParticipants ? '+' : null} participant
          {cascade.participants === 1 ? '' : 's'}
        </li>
        <li data-testid="tournament-cascade-notice-rounds">
          <CountLabel value={cascade.rounds} /> round
          {cascade.rounds === 1 ? '' : 's'}
        </li>
        <li data-testid="tournament-cascade-notice-leaderboards">
          <CountLabel value={cascade.leaderboards} /> leaderboard
          {cascade.leaderboards === 1 ? '' : 's'}
        </li>
      </ul>
    </div>
  );
}
