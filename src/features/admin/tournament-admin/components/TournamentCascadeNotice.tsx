"use client";

import type React from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import type { TournamentCascadeDto } from "../admin-tournament-types";

export interface TournamentCascadeNoticeProps {
  cascade: TournamentCascadeDto | null;

  isLoading: boolean;
}

function CountLabel({ value }: { value: number | null }): React.ReactElement {
  const display = value === null ? "—" : value;
  return (
    <span
      className="font-mono font-medium tabular-nums text-foreground"
      data-testid="tournament-cascade-notice-count"
    >
      {display}
    </span>
  );
}

export function TournamentCascadeNotice({
  cascade,
  isLoading,
}: TournamentCascadeNoticeProps): React.ReactElement {
  if (isLoading) {
    return (
      <div
        className="space-y-2"
        role="status"
        data-testid="tournament-cascade-notice-loading"
        aria-busy="true"
        aria-label="Loading affected records"
      >
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
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
      <p className="mb-2 font-semibold text-foreground">This action affects:</p>
      <ul className="list-inside list-disc space-y-1">
        <li data-testid="tournament-cascade-notice-participants">
          <CountLabel value={cascade.participants} />
          {cascade.hasMoreParticipants ? "+" : null} participant
          {cascade.participants === 1 ? "" : "s"}
        </li>
        <li data-testid="tournament-cascade-notice-rounds">
          <CountLabel value={cascade.rounds} /> round
          {cascade.rounds === 1 ? "" : "s"}
        </li>
        <li data-testid="tournament-cascade-notice-leaderboards">
          <CountLabel value={cascade.leaderboards} /> leaderboard
          {cascade.leaderboards === 1 ? "" : "s"}
        </li>
      </ul>
    </div>
  );
}
