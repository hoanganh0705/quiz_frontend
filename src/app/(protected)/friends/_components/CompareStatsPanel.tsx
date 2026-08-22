"use client";

import { memo } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

import { useUnfriend } from "@/features/social/hooks";

import { useUserProfileBundle } from "@/features/users/hooks/use-user-profile-bundle";

import type { SocialUserSummaryDto } from "@/features/social/types";

import { displayNameOf } from "@/features/social/utils/display-name";

export interface CompareStatsPanelProps {
  friend: SocialUserSummaryDto;
  myAnalytics: {
    xpTotal: number;
    quizzesCompleted: number;
    averageScore: number;
    totalTimeSpentMinutes: number;
    currentStreak: number;
    longestStreak: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
  } | null;
  myAnalyticsLoading: boolean;
  viewerLabel: string;
}

export const CompareStatsPanel = memo(function CompareStatsPanel({
  friend,
  myAnalytics,
  myAnalyticsLoading,
  viewerLabel,
}: CompareStatsPanelProps) {
  const name = displayNameOf(friend);
  const {
    analytics: friendAnalytics,
    isLoading: friendAnalyticsLoading,
    error: friendAnalyticsError,
  } = useUserProfileBundle(friend.userId);
  const unfriendMut = useUnfriend(friend.userId, {
    // The row came from `GET /social/friends/:userId`, which is a
    // server-authoritative source. The relationship is by definition
    // `friend`, so the permission guard inside `useUnfriend` is
    // redundant here — its `useRelationship` round-trip would race
    // against the optimistic UI and leave the button enabled but
    // silently no-op. `assumeCanUnfriend: true` opts the call out of
    // the permission gate.
    assumeCanUnfriend: true,
  });

  const friendSummary = friendAnalytics?.summary ?? null;
  const isFriendPrivate =
    friendAnalyticsError !== null && friendAnalyticsError.status === 403;
  const friendStatsErrorMessage =
    friendAnalyticsError !== null && friendAnalyticsError.status !== 403
      ? friendAnalyticsError.message
      : null;

  // The viewer side renders the personalized analytics surface
  // (xpTotal, quizzesCompleted, ...). The friend side renders the
  // public bundle summary (totalAttempts, completedQuizzes,
  // averageScore). The two shape-mismatch rows on the viewer side
  // (Win Rate, Longest Streak) are dropped because the friend
  // surface has no equivalent fields — comparing across mismatched
  // shapes is misleading.
  const youQuizzesPlayed = myAnalyticsLoading
    ? null
    : myAnalytics
      ? myAnalytics.quizzesCompleted.toLocaleString()
      : null;
  const youAverageScore = myAnalyticsLoading
    ? null
    : myAnalytics
      ? `${myAnalytics.averageScore.toFixed(1)}%`
      : null;

  const themQuizzesPlayed = friendAnalyticsLoading
    ? null
    : isFriendPrivate
      ? "Private"
      : friendSummary
        ? friendSummary.completedQuizzes.toLocaleString()
        : null;
  const themAverageScore = friendAnalyticsLoading
    ? null
    : isFriendPrivate
      ? "Private"
      : friendSummary
        ? `${friendSummary.averageScore.toFixed(1)}%`
        : null;
  const themTotalAttempts = friendAnalyticsLoading
    ? null
    : isFriendPrivate
      ? "Private"
      : friendSummary
        ? friendSummary.totalAttempts.toLocaleString()
        : null;

  return (
    <div className="space-y-3 text-sm">
      {friendAnalyticsLoading ? (
        <>
          <CompareRowSkeleton />
          <CompareRowSkeleton />
          <CompareRowSkeleton />
        </>
      ) : (
        <>
          <CompareRow
            label="Quizzes Played"
            youValue={youQuizzesPlayed}
            themLabel={name}
            themValue={themQuizzesPlayed}
          />
          <CompareRow
            label="Average Score"
            youValue={youAverageScore}
            themLabel={name}
            themValue={themAverageScore}
          />
          <CompareRow
            label="Total Attempts"
            youValue={
              myAnalyticsLoading
                ? null
                : myAnalytics
                  ? myAnalytics.quizzesCompleted.toLocaleString()
                  : null
            }
            themLabel={name}
            themValue={themTotalAttempts}
          />
        </>
      )}
      {friendStatsErrorMessage && (
        <p className="text-xs text-foreground-secondary" role="status">
          Friend stats unavailable.
        </p>
      )}
      {unfriendMut.isPending && (
        <p className="text-xs text-foreground-secondary">Unfriending…</p>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={unfriendMut.unfriend}
        disabled={unfriendMut.isPending || unfriendMut.alreadyNotFriends}
        aria-label={`Unfriend ${name}`}
      >
        Unfriend
      </Button>
      <p className="text-xs text-foreground-secondary">
        {viewerLabel} vs {name}
      </p>
    </div>
  );
});

interface CompareRowProps {
  label: string;
  youValue: string | React.ReactNode | null;
  themLabel: string;
  themValue: string | React.ReactNode | null;
}

const CompareRow = memo(function CompareRow({
  label,
  youValue,
  themLabel,
  themValue,
}: CompareRowProps) {
  return (
    <div className="border border-border rounded-md p-3">
      <p className="font-semibold mb-2">{label}</p>
      <p>
        You: {youValue ?? <span aria-label={`${label} not available`}>—</span>}
      </p>
      <p>
        {themLabel}:{" "}
        {themValue ?? (
          <span aria-label={`${themLabel} ${label} not available`}>—</span>
        )}
      </p>
    </div>
  );
});

function CompareRowSkeleton() {
  return (
    <div className="border border-border rounded-md p-3">
      <Skeleton className="h-4 w-28 mb-2" />
      <Skeleton className="h-3 w-20 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
