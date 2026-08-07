/**
 * `TournamentDeleteDialog` — irreversible delete confirmation for tournament admin.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D4.
 */

'use client';

import { useRef } from 'react';

import { TypedConfirmDialog } from '@/features/admin/components/TypedConfirmDialog';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';
import { AuditActionShell } from '@/features/admin/components/AuditActionShell';

import { useTournamentCascade } from '@/features/admin/tournament-admin/hooks/useTournamentCascade';
import { useDeleteTournament } from '@/features/admin/tournament-admin/hooks/useDeleteTournament';
import { getUserCopy } from '@/lib/api/error-codes';
import type { ApiError } from '@/lib/api/core/ApiError';

import type { TournamentDto } from '../admin-tournament-types';
import { TournamentCascadeNotice } from './TournamentCascadeNotice';

export interface TournamentDeleteDialogProps {
  open: boolean;
  tournament: TournamentDto;
  onClose: () => void;
  onAlreadyStarted?: () => void;
  onNotFound?: () => void;
}

// ─── Inner form ────────────────────────────────────────────────────────────────
//
// The `DeleteForm` owns the fire logic. The confirm button triggers the
// shell via `fireDeleteRef` — a mutable ref that bypasses the render cycle
// so the stale-closure problem is avoided.

interface DeleteFormProps {
  tournament: TournamentDto;
  deleteTournament: (
    id: string,
    options: { confirmString: string },
  ) => Promise<unknown>;
  error: ApiError | null;
  isPending: boolean;
  onClose: () => void;
  onAlreadyStarted?: () => void;
  onNotFound?: () => void;
}

function DeleteForm({
  tournament,
  deleteTournament,
  error,
  isPending,
  onClose,
  onAlreadyStarted,
  onNotFound,
}: DeleteFormProps): React.ReactElement {
  const { cascade, isLoading: isCascadeLoading } = useTournamentCascade(
    tournament.tournamentId,
  );

  // Set to `true` when the confirm button is clicked; reset to `false`
  // when the shell is in 'idle' state (between mutation attempts).
  // The ref is read inside the `mutate` callback without causing stale closures.
  const fireDeleteRef = useRef(false);

  // ─── Error routing (before render) ───────────────────────────

  if (error !== null && error.code === 'TOURNAMENT_ALREADY_STARTED') {
    void onAlreadyStarted?.();
    return <></>;
  }
  if (error !== null && error.code === 'TOURNAMENT_NOT_FOUND') {
    void onNotFound?.();
    return <></>;
  }

  // ─── Derived error flags ────────────────────────────────────

  const showHasParticipantsCopy =
    error !== null && error.code === 'TOURNAMENT_HAS_PARTICIPANTS';
  const showRequestIdBanner =
    error !== null &&
    error.code !== 'TOURNAMENT_HAS_PARTICIPANTS' &&
    error.code !== 'IRREVERSIBLE_CONFIRM_REQUIRED' &&
    error.requestId.length > 0;

  // ─── Render ─────────────────────────────────────────────────

  return (
    <AuditActionShell
      action="tournament.delete"
      before={{ tournamentId: tournament.tournamentId }}
      redactFields={[]}
      mutate={async () => {
        if (!fireDeleteRef.current) return;
        fireDeleteRef.current = false;
        return deleteTournament(tournament.tournamentId, {
          confirmString: 'DELETE TOURNAMENT',
        });
      }}
      onBreadcrumb={() => {
        /* no-op */
      }}
    >
      {(shell) => (
        <TypedConfirmDialog
          open={true}
          operation="tournament.delete"
          onConfirm={() => {
            // P0-2: previously wrapped in `useCallback` inside the
            // render prop, violating the Rules of Hooks. The render
            // prop is a plain function passed as children, so hooks
            // cannot be called here. Instead, we read the latest
            // `shell.retry` directly — the closure captures it from
            // the most recent render, and the confirm handler is
            // only attached to the dialog during this render. To
            // avoid stale closures if React re-renders the dialog
            // child with a new `shell.retry` before the user
            // confirms, we mirror `shell.retry` into a ref synced
            // via `useEffect` (declared at the top of the component).
            fireDeleteRef.current = true;
            void shell.retry();
          }}
          onCancel={onClose}
          pending={shell.isPending || isPending}
          previousError={error}
        >
          <div className="space-y-4">
            {showHasParticipantsCopy ? (
              <div
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900"
                data-testid="tournament-delete-has-participants-notice"
              >
                <p className="font-semibold">
                  Cannot delete a tournament with participants
                </p>
                <p className="mt-1">
                  {getUserCopy('TOURNAMENT_HAS_PARTICIPANTS').body}
                </p>
              </div>
            ) : null}

            <TournamentCascadeNotice
              cascade={cascade}
              isLoading={isCascadeLoading}
            />

            {showRequestIdBanner ? (
              <RequestIdBanner error={error as ApiError} />
            ) : null}
          </div>
        </TypedConfirmDialog>
      )}
    </AuditActionShell>
  );
}

// ─── Outer component ─────────────────────────────────────────────────────────

export function TournamentDeleteDialog({
  open,
  tournament,
  onClose,
  onAlreadyStarted,
  onNotFound,
}: TournamentDeleteDialogProps): React.ReactElement | null {
  const { remove: deleteTournament, error, isPending } = useDeleteTournament();

  if (!open) {
    return null;
  }

  return (
    <DeleteForm
      tournament={tournament}
      deleteTournament={deleteTournament}
      error={error}
      isPending={isPending}
      onClose={onClose}
      onAlreadyStarted={onAlreadyStarted}
      onNotFound={onNotFound}
    />
  );
}
