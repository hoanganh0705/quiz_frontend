"use client";

import type React from "react";
import { useCallback, useEffect, useRef } from "react";

import { AuditActionShell } from "@/features/admin/components/AuditActionShell";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import { TypedConfirmDialog } from "@/features/admin/components/TypedConfirmDialog";
import { useDeleteTournament } from "@/features/admin/tournament-admin/hooks/useDeleteTournament";
import { useTournamentCascade } from "@/features/admin/tournament-admin/hooks/useTournamentCascade";
import type { ApiError } from "@/lib/api/core/ApiError";
import { getUserCopy } from "@/lib/api/error-codes";

import type { TournamentDto } from "../admin-tournament-types";
import { TournamentCascadeNotice } from "./TournamentCascadeNotice";

export interface TournamentDeleteDialogProps {
  open: boolean;
  tournament: TournamentDto;
  onClose: () => void;
  onAlreadyStarted?: () => void;
  onNotFound?: () => void;
}

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
}: DeleteFormProps): React.ReactElement | null {
  const { cascade, isLoading: isCascadeLoading } = useTournamentCascade(
    tournament.tournamentId,
  );

  const fireDeleteRef = useRef(false);
  const handledTerminalErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error === null) {
      handledTerminalErrorRef.current = null;
      return;
    }
    if (handledTerminalErrorRef.current === error.code) {
      return;
    }
    if (error.code === "TOURNAMENT_ALREADY_STARTED") {
      handledTerminalErrorRef.current = error.code;
      onAlreadyStarted?.();
    } else if (error.code === "TOURNAMENT_NOT_FOUND") {
      handledTerminalErrorRef.current = error.code;
      onNotFound?.();
    }
  }, [error, onAlreadyStarted, onNotFound]);

  const handleBreadcrumb = useCallback(
    (breadcrumb: unknown) => {
      if (
        typeof breadcrumb === "object" &&
        breadcrumb !== null &&
        "status" in breadcrumb &&
        (breadcrumb as { status?: string }).status === "success"
      ) {
        onClose();
      }
    },
    [onClose],
  );

  const isTerminalError =
    error !== null &&
    (error.code === "TOURNAMENT_ALREADY_STARTED" ||
      error.code === "TOURNAMENT_NOT_FOUND");

  if (isTerminalError) {
    return null;
  }

  const showHasParticipantsCopy =
    error !== null && error.code === "TOURNAMENT_HAS_PARTICIPANTS";
  const showRequestIdBanner =
    error !== null &&
    error.code !== "TOURNAMENT_HAS_PARTICIPANTS" &&
    error.code !== "IRREVERSIBLE_CONFIRM_REQUIRED" &&
    error.requestId.length > 0;

  return (
    <AuditActionShell
      action="tournament.delete"
      before={{ tournamentId: tournament.tournamentId }}
      redactFields={[]}
      mutate={async () => {
        if (!fireDeleteRef.current) return;
        fireDeleteRef.current = false;
        return deleteTournament(tournament.tournamentId, {
          confirmString: "DELETE TOURNAMENT",
        });
      }}
      onBreadcrumb={handleBreadcrumb}
    >
      {(shell) => (
        <TypedConfirmDialog
          open={true}
          operation="tournament.delete"
          onConfirm={() => {
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
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                data-testid="tournament-delete-has-participants-notice"
              >
                <p className="font-semibold">
                  Cannot delete a tournament with participants
                </p>
                <p className="mt-1">
                  {getUserCopy("TOURNAMENT_HAS_PARTICIPANTS").body}
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
