"use client";

import { useCallback, useState } from "react";

import {
  getPositionForPeriod,
  useMyRanking,
} from "@/features/leaderboard/hooks/useMyRanking";

import { ArenaPulseRailCard } from "./ArenaPulseRailCard";
import { FindFriendsPopup } from "./FindFriendsPopup";
import { FriendsLeaderboardStage } from "./FriendsLeaderboardStage";
import {
  LeaderboardHeader,
  type LeaderboardArenaScope,
} from "./LeaderboardHeader";
import {
  LeaderboardPage,
  type LeaderboardSummarySnapshot,
} from "./LeaderboardPage";
import { PersonalTelemetryRailCard } from "./PersonalTelemetryRailCard";
import { PlayerDossierSheet } from "./PlayerDossierSheet";

import type { SelectedPlayerPreview } from "@/features/leaderboard/hooks/usePlayerDossier";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

export function LeaderboardArena() {
  const [scope, setScope] = useState<LeaderboardArenaScope>("global");
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [summary, setSummary] = useState<LeaderboardSummarySnapshot>({
    totalParticipants: null,
    resetInSeconds: null,
  });
  const [selectedPlayer, setSelectedPlayer] =
    useState<SelectedPlayerPreview | null>(null);
  const [showFindFriends, setShowFindFriends] = useState(false);

  const { data: myRanking } = useMyRanking();
  const myPosition = getPositionForPeriod(myRanking, period);
  const currentUserRank = myPosition?.rank ?? null;

  const handleSummaryChange = useCallback(
    (next: LeaderboardSummarySnapshot) => {
      setSummary((prev) =>
        prev.totalParticipants === next.totalParticipants &&
        prev.resetInSeconds === next.resetInSeconds
          ? prev
          : next,
      );
    },
    [],
  );

  const handleOpenFindFriends = useCallback(() => {
    setShowFindFriends(true);
  }, []);

  const handleCloseFindFriends = useCallback(() => {
    setShowFindFriends(false);
  }, []);

  const handleSelectPlayer = useCallback((player: SelectedPlayerPreview) => {
    setSelectedPlayer(player);
  }, []);

  const handleCloseDossier = useCallback(() => {
    setSelectedPlayer(null);
  }, []);

  return (
    <div className="@container space-y-6 md:space-y-8">
      <LeaderboardHeader
        period={period}
        onPeriodChange={setPeriod}
        scope={scope}
        onScopeChange={setScope}
        totalParticipants={summary.totalParticipants}
        resetInSeconds={summary.resetInSeconds}
        onOpenFindFriends={handleOpenFindFriends}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div
          role="tabpanel"
          id={`arena-scope-panel-${scope}`}
          aria-labelledby={`arena-scope-tab-${scope}`}
          className="lg:col-span-8 min-w-0"
        >
          {scope === "global" ? (
            <LeaderboardPage
              period={period}
              onPeriodChange={setPeriod}
              onSummaryChange={handleSummaryChange}
              onSelectPlayer={handleSelectPlayer}
              hideInlinePeriodSelector
            />
          ) : (
            <FriendsLeaderboardStage
              period={period}
              onOpenFindFriends={handleOpenFindFriends}
              onSelectPlayer={handleSelectPlayer}
            />
          )}
        </div>

        <aside
          aria-label="Competitive telemetry and arena pulse"
          className="lg:col-span-4 lg:sticky lg:top-20 space-y-6 min-w-0"
        >
          <PersonalTelemetryRailCard
            period={period}
            onSelectPlayer={handleSelectPlayer}
          />
          <ArenaPulseRailCard
            period={period}
            currentUserRank={currentUserRank}
            onSelectPlayer={handleSelectPlayer}
          />
        </aside>
      </div>

      <PlayerDossierSheet
        player={selectedPlayer}
        period={period}
        onClose={handleCloseDossier}
      />

      <FindFriendsPopup
        isOpen={showFindFriends}
        onClose={handleCloseFindFriends}
      />
    </div>
  );
}
