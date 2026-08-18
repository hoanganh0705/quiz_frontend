"use client";

import * as React from "react";

import {
useTournamentFeatureFlag,
useTournament,
useTournamentParticipants,
useTournamentLeaderboard,
useTournamentParticipation,
} from "@/features/tournaments/hooks";

import {
TournamentPlaceholder,
TournamentDetailSkeleton,
TournamentErrorState,
TournamentHeader,
ParticipantList,
TournamentLeaderboard,
TournamentRegistrationCta,
TournamentCapacityIndicator,
RegistrationState,
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

const tournamentResult = useTournament(tournamentId);
const participantsResult = useTournamentParticipants(tournamentId);
const leaderboardResult = useTournamentLeaderboard(tournamentId);
const participationResult = useTournamentParticipation(tournamentId);

if (isPlaceholder) {
return <TournamentPlaceholder />;
  }

if (tournamentResult.isLoading) {
return (
<div className={className}>
<TournamentDetailSkeleton />
</div>
    );
  }

if (tournamentResult.error !== null) {
const errorCode = tournamentResult.error.code;

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
<TournamentErrorState
error={null}
        />
</div>
    );
  }

const tournament = tournamentResult.tournament;

return (
<div className={className}>
<div className="space-y-8">
{/* Header */}
<div className="flex flex-col gap-4">
<TournamentHeader tournament={tournament} />

{/* Registration area: CTA + capacity indicator + status */}
<div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card">
<div className="flex-1">
{/* Registration state indicator */}
<div className="flex items-center gap-3">
<RegistrationState status={participationResult.participation?.registrationStatus ?? null} />
<TournamentCapacityIndicator
currentParticipants={tournament.totalParticipants}
maxParticipants={tournament.maxParticipants}
                />
</div>
</div>
{/* Registration CTA */}
<div className="shrink-0">
<TournamentRegistrationCta
tournamentId={tournament.id}
tournamentName={tournament.title}
              />
</div>
</div>
</div>

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
