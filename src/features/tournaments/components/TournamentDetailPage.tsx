"use client";

import * as React from "react";

import { Ban, CheckCircle2, PlayCircle, Trophy } from "lucide-react";

import {
  ParticipantList,
  RegistrationState,
  TournamentCapacityIndicator,
  TournamentDetailSkeleton,
  TournamentErrorState,
  TournamentHeader,
  TournamentLeaderboard,
  TournamentRegistrationCta,
} from "@/features/tournaments/components";
import {
  useTournament,
  useTournamentLeaderboard,
  useTournamentParticipants,
  useTournamentParticipation,
} from "@/features/tournaments/hooks";
import {
  isTournamentRegistrationOpen,
  resolveEffectiveTournamentStatus,
} from "@/features/tournaments/lib/tournament-lifecycle";

export interface TournamentDetailPageProps {
  tournamentId: string;
  className?: string;
}

const ENDED_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatEndedDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return ENDED_DATE_FORMATTER.format(date);
}

export function TournamentDetailPage({
  tournamentId,
  className,
}: TournamentDetailPageProps) {
  const tournamentResult = useTournament(tournamentId);
  const participantsResult = useTournamentParticipants(tournamentId);
  const leaderboardResult = useTournamentLeaderboard(tournamentId);
  const participationResult = useTournamentParticipation(tournamentId);

  if (tournamentResult.isLoading) {
    return (
      <div className={className}>
        <TournamentDetailSkeleton />
      </div>
    );
  }

  if (tournamentResult.error !== null) {
    return (
      <div className={className}>
        <TournamentErrorState
          error={tournamentResult.error}
          onRetry={tournamentResult.refresh}
        />
      </div>
    );
  }

  if (tournamentResult.tournament === null) {
    return (
      <div className={className}>
        <TournamentErrorState error={null} />
      </div>
    );
  }

  const tournament = tournamentResult.tournament;
  const effectiveStatus = resolveEffectiveTournamentStatus(tournament);
  const registrationOpen = isTournamentRegistrationOpen(tournament);
  const endedDate = formatEndedDate(tournament.endAt);

  return (
    <div className={className}>
      <div className="space-y-8">
        {/* Header + lifecycle banner / registration bar */}
        <div className="flex flex-col gap-4">
          <TournamentHeader tournament={tournament} />

          {effectiveStatus === "finished" ? (
            <div
              className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              data-testid="tournament-finished-banner"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Trophy className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      Tournament ended
                    </h2>
                    {endedDate ? (
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        · {endedDate}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Registration is closed. Final standings are archived below.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {participationResult.isRegistered ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    You participated
                  </span>
                ) : null}
                <TournamentCapacityIndicator
                  currentParticipants={tournament.totalParticipants}
                  maxParticipants={tournament.maxParticipants}
                />
              </div>
            </div>
          ) : effectiveStatus === "cancelled" ? (
            <div
              className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              data-testid="tournament-cancelled-banner"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Ban className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    Tournament cancelled
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    This tournament has been cancelled and is no longer
                    accepting registrations.
                  </p>
                </div>
              </div>
            </div>
          ) : effectiveStatus === "ongoing" ? (
            <div
              className="flex flex-col gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              data-testid="tournament-ongoing-banner"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <PlayCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    Tournament in progress
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Registration is closed while matches are underway.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {participationResult.isRegistered ? (
                  <RegistrationState status="registered" />
                ) : (
                  <RegistrationState status="closed" />
                )}
                <TournamentCapacityIndicator
                  currentParticipants={tournament.totalParticipants}
                  maxParticipants={tournament.maxParticipants}
                />
              </div>
            </div>
          ) : participationResult.isLoading ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border bg-card">
              <div className="flex-1 flex items-center gap-3">
                <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="shrink-0">
                <div className="h-10 w-32 rounded-md bg-muted animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border bg-card">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <RegistrationState
                    status={
                      participationResult.participation?.registrationStatus ??
                      null
                    }
                  />
                  <TournamentCapacityIndicator
                    currentParticipants={tournament.totalParticipants}
                    maxParticipants={tournament.maxParticipants}
                  />
                </div>
              </div>
              <div className="shrink-0">
                <TournamentRegistrationCta
                  tournamentId={tournament.id}
                  tournamentName={tournament.title}
                  isRegistrationOpen={registrationOpen}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content panels by tournament lifecycle */}
        {effectiveStatus === "finished" ? (
          <TournamentLeaderboard
            leaderboardResult={leaderboardResult}
            title="Final Standings"
          />
        ) : effectiveStatus === "cancelled" ? null : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <ParticipantList
                participantsResult={participantsResult}
                isRegistrationOpen={registrationOpen}
              />
            </div>

            <div>
              <TournamentLeaderboard leaderboardResult={leaderboardResult} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
