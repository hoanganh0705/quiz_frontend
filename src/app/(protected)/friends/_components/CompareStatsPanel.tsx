"use client";

import { memo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { UnfriendConfirmDialog } from "@/features/social/components/UnfriendConfirmDialog";
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const {
    analytics: friendAnalytics,
    summary: friendProfileSummary,
    isLoading: friendAnalyticsLoading,
    error: friendAnalyticsError,
  } = useUserProfileBundle(friend.userId);

  const unfriendMut = useUnfriend(friend.userId, {
    assumeCanUnfriend: true,
  });

  const friendSummary = friendAnalytics?.summary ?? null;
  const isFriendPrivate =
    friendAnalyticsError !== null && friendAnalyticsError.status === 403;
  const friendStatsErrorMessage =
    friendAnalyticsError !== null && friendAnalyticsError.status !== 403
      ? friendAnalyticsError.message
      : null;

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
  const youXpTotal = myAnalyticsLoading
    ? null
    : myAnalytics
      ? myAnalytics.xpTotal.toLocaleString()
      : null;
  const youCurrentStreak = myAnalyticsLoading
    ? null
    : myAnalytics
      ? `${myAnalytics.currentStreak}d`
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
  const themXpTotal = friendAnalyticsLoading
    ? null
    : isFriendPrivate
      ? "Private"
      : friendProfileSummary
        ? friendProfileSummary.xpTotal.toLocaleString()
        : null;
  const themCurrentStreak = friendAnalyticsLoading
    ? null
    : isFriendPrivate
      ? "Private"
      : friendProfileSummary
        ? `${friendProfileSummary.currentStreak}d`
        : null;

  return (
    <div className="space-y-3 text-sm">
      {friendAnalyticsLoading ? (
        <>
          <CompareRowSkeleton />
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
            label="Total XP"
            youValue={youXpTotal}
            themLabel={name}
            themValue={themXpTotal}
          />
          <CompareRow
            label="Current Streak"
            youValue={youCurrentStreak}
            themLabel={name}
            themValue={themCurrentStreak}
          />
        </>
      )}

      {friendStatsErrorMessage && (
        <p className="text-xs text-muted-foreground" role="status">
          Friend stats unavailable.
        </p>
      )}

      <div className="pt-2 flex items-center justify-between border-t border-border/40 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
          onClick={() => setIsConfirmOpen(true)}
          disabled={unfriendMut.isPending || unfriendMut.alreadyNotFriends}
          aria-label={`Unfriend ${name}`}
        >
          Unfriend
        </Button>
        <span className="text-xs text-muted-foreground font-medium truncate max-w-[180px] text-right">
          {viewerLabel} vs {name}
        </span>
      </div>

      <UnfriendConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        targetUserId={friend.userId}
      />
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
    <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-xs transition-colors hover:border-brand/30">
      <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm font-mono tabular-nums">
        <div className="rounded-lg bg-background/50 border border-border/40 p-2.5">
          <span className="text-xs text-muted-foreground font-sans block mb-0.5">You</span>
          <span className="font-bold text-foreground text-base">
            {youValue ?? <span aria-label={`${label} not available`}>—</span>}
          </span>
        </div>
        <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 min-w-0">
          <span className="text-xs text-muted-foreground font-sans block truncate mb-0.5">{themLabel}</span>
          <span className="font-bold text-foreground text-base">
            {themValue ?? (
              <span aria-label={`${themLabel} ${label} not available`}>—</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

function CompareRowSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-xs">
      <Skeleton className="h-3 w-24 mb-2.5" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 space-y-1.5">
          <Skeleton className="h-2.5 w-8" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 space-y-1.5">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}
