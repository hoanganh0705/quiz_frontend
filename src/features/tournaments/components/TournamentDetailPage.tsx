"use client";

/**
 * `TournamentDetailPage` — tournament detail page composition.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.G2.
 */

import * as React from "react";

import { useTournamentFeatureFlag } from "@/features/tournaments/hooks";
import { useTournament } from "@/features/tournaments/hooks";
import { useTournamentParticipants } from "@/features/tournaments/hooks";
import { useTournamentLeaderboard } from "@/features/tournaments/hooks";

import {
  TournamentPlaceholder,
  TournamentDetailSkeleton,
  TournamentErrorState,
} from "@/features/tournaments/components";

import {
  TournamentHeader,
  ParticipantList,
  TournamentLeaderboard,
} from "@/features/tournaments/components";

export interface TournamentDetailPageProps {
  tournamentId: string;
  className?: string;
}

export function TournamentDetailPage({
  tournamentId,
  className,
}: TournamentDetailPageProps) {
  const { isPlaceholder } = useTournamentFeatureFlag();

  if (isPlaceholder) {
    return <TournamentPlaceholder />;
  }

  const tournamentResult = useTournament(tournamentId);
  const participantsResult = useTournamentParticipants(tournamentId);
  const leaderboardResult = useTournamentLeaderboard(tournamentId);

  // Loading state
  if (tournamentResult.isLoading) {
    return (
      <div className={className}>
        <TournamentDetailSkeleton />
      </div>
    );
  }

  // Error state - check for known error codes
  if (tournamentResult.error !== null) {
    const errorCode = tournamentResult.error.code;

    // Not found state
    if (errorCode === "TOURNAMENT_NOT_FOUND") {
      return (
        <div className={className}>
          <TournamentErrorState
            error={tournamentResult.error}
            onRetry={tournamentResult.refresh}
          />
        </div>
      );
    }

    // Private/unauthorized state
    if (errorCode === "TOURNAMENT_FORBIDDEN") {
      return (
        <div className={className}>
          <TournamentErrorState
            error={tournamentResult.error}
            onRetry={tournamentResult.refresh}
          />
        </div>
      );
    }

    // Generic error
    return (
      <div className={className}>
        <TournamentErrorState
          error={tournamentResult.error}
          onRetry={tournamentResult.refresh}
        />
      </div>
    );
  }

  // If we have no error but also no tournament data, show not found
  if (tournamentResult.tournament === null) {
    return (
      <div className={className}>
        <TournamentErrorState
          error={null}
        />
      </div>
    );
  }

  // Tournament loaded successfully
  const tournament = tournamentResult.tournament;

  return (
    <div className={className}>
      <div className="space-y-8">
        {/* Header */}
        <TournamentHeader tournament={tournament} />

        {/* Participants and Leaderboard panels */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Participants panel */}
          <div>
            <ParticipantList participantsResult={participantsResult} />
          </div>

          {/* Leaderboard panel */}
          <div>
            <TournamentLeaderboard leaderboardResult={leaderboardResult} />
          </div>
        </div>
      </div>
    </div>
  );
}
