"use client";

import { memo, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Share2,
  Check,
  Calendar,
  MapPin,
  BadgeCheck,
  Star,
  Users,
  Flame,
  Trophy,
  BookOpen,
  Gamepad2,
  TrendingUp,
  Sparkles,
  Clock,
  UserPlus,
  UserCheck,
  Edit,
  MessageCircle,
} from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Progress } from "@/components/ui/Progress";

import { QuizCard } from "@/components/primitives/QuizCard/QuizCard";
import ActivityItem from "@/features/users/components/profile/ActivityItem";
import CategoryRow from "@/features/users/components/profile/CategoryRow";

import type { Player } from "@/features/users/types";
import type { UserSummaryResponseDto } from "@/lib/api/generated/schemas";
import { usePublicProfilePage } from "@/features/users/hooks/use-public-profile-page";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
  useRelationship,
  useFollow,
  useUnfollow,
} from "@/features/social/hooks";
import { useClipboard } from "@/shared/hooks";

interface PublicProfileHeaderProps {
  player: Player;
  joinedDate: string;
  summary: UserSummaryResponseDto | null;
  resolvedUserId: string | null;
  username: string;
  isSelf: boolean;
}

const ProfileHero = memo(function ProfileHero({
  player,
  joinedDate,
  summary,
  resolvedUserId,
  username,
  isSelf,
}: PublicProfileHeaderProps) {
  const router = useRouter();
  const auth = useAuthSession();

  const { relationship } = useRelationship(resolvedUserId);
  const { follow, isPending: isFollowPending } = useFollow(resolvedUserId);
  const { unfollow, isPending: isUnfollowPending } =
    useUnfollow(resolvedUserId);

  const isFollowing = relationship === "following" || relationship === "friend";

  const handleFollowToggle = useCallback(() => {
    if (!auth.isAuthenticated) {
      router.push("/login");
      return;
    }
    if (isFollowing) {
      unfollow();
    } else {
      follow();
    }
  }, [auth.isAuthenticated, isFollowing, unfollow, follow, router]);

  const displayName = summary?.displayName ?? player.name;
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const level = summary?.level ?? player.level ?? 1;
  const currentLevelXP = summary?.currentLevelXP ?? 0;
  const nextLevelXP = summary?.nextLevelXP ?? 100;
  const levelProgressPercent =
    summary?.xpProgressPercent ??
    (nextLevelXP > 0
      ? Math.min(100, Math.max(0, (currentLevelXP / nextLevelXP) * 100))
      : 0);
  const xpToNextLevel = Math.max(0, nextLevelXP - currentLevelXP);
  const totalXP = summary?.xpTotal ?? currentLevelXP;

  return (
    <div className="relative rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm mb-6">
      {/* Arcade Cover Banner */}
      <section
        aria-label="Cover banner"
        className="relative h-44 sm:h-52 w-full overflow-hidden bg-linear-to-r from-violet-600/30 via-indigo-600/20 to-purple-600/30 dark:from-violet-950/60 dark:via-indigo-950/40 dark:to-purple-950/60"
      >
        {summary?.bgImageUrl ? (
          <Image
            src={summary.bgImageUrl}
            alt="Profile banner"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]">
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          </div>
        )}
      </section>

      {/* Header Info Body */}
      <div className="px-6 sm:px-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
          {/* Floating Avatar */}
          <div className="relative">
            <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-card rounded-3xl shadow-xl ring-2 ring-primary/20 bg-card">
              <AvatarImage
                src={summary?.avatarUrl ?? player.avatarUrl ?? undefined}
                alt={`${displayName}'s avatar`}
                className="object-cover"
              />
              <AvatarFallback className="text-3xl font-bold rounded-3xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute bottom-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-card"
              title="Online"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>

          {/* Action Buttons */}
          <nav
            className="flex items-center gap-3 self-start sm:self-end pt-2"
            aria-label="Profile actions"
          >
            {isSelf ? (
              <Button
                asChild
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-sm"
              >
                <Link href="/settings?tab=account">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleFollowToggle}
                  variant={isFollowing ? "outline" : "default"}
                  disabled={isFollowPending || isUnfollowPending}
                  aria-label={
                    isFollowing
                      ? `Unfollow ${displayName}`
                      : `Follow ${displayName}`
                  }
                  className={`gap-2 rounded-xl font-medium transition-all ${
                    isFollowing
                      ? "border-primary/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-border/80 hover:bg-accent"
                  asChild
                >
                  <Link href={`/messages?user=${resolvedUserId || username}`}>
                    <MessageCircle className="w-4 h-4" />
                    <span>Message</span>
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>

        {/* Identity Details */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
              {displayName}
            </h1>
            <Badge className="bg-primary/15 text-primary border-primary/25 gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>Verified</span>
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full"
              aria-label={`Level ${level}`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Level {level}</span>
            </Badge>
            {summary?.levelTitleLocalised && (
              <Badge
                variant="secondary"
                className="text-xs px-2.5 py-0.5 font-medium rounded-full bg-secondary/80 text-secondary-foreground"
              >
                {summary.levelTitleLocalised}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground/80">
              @{username}
            </span>
            {summary?.country && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{summary.country}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Joined {joinedDate}</span>
            </span>
          </div>

          {summary?.bio ? (
            <p className="text-foreground/90 text-sm max-w-2xl leading-relaxed">
              {summary.bio}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Passionate quiz enthusiast on QuizHub. Exploring challenges and
              conquering leaderboards.
            </p>
          )}
        </div>

        {/* Level Progression Strip */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">XP Progression</span>
              <span className="text-muted-foreground">• Level {level}</span>
            </div>
            <div className="font-mono text-muted-foreground">
              <span className="font-semibold text-foreground">
                {currentLevelXP.toLocaleString()}
              </span>{" "}
              / {nextLevelXP.toLocaleString()} XP
              <span className="ml-2 text-primary font-medium">
                ({Math.round(levelProgressPercent)}%)
              </span>
            </div>
          </div>
          <Progress
            value={levelProgressPercent}
            className="h-2 rounded-full"
            aria-label={`Level progress: ${levelProgressPercent.toFixed(0)}%`}
          />
          <div className="flex justify-between items-center mt-2 text-[11px] text-muted-foreground font-mono">
            <span>
              {xpToNextLevel.toLocaleString()} XP to Level {level + 1}
            </span>
            <span>Total XP: {totalXP.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

const StatsPanel = memo(function StatsPanel({
  averageScore,
  winRate,
  player,
  bestCategory,
  mostPlayedCategory,
  completionRate,
  highestStreak,
  summary,
  joinedDate,
}: {
  averageScore: number;
  winRate: number;
  player: Player;
  bestCategory: string;
  mostPlayedCategory: string;
  completionRate: number | null;
  highestStreak: number | null;
  summary: UserSummaryResponseDto | null;
  joinedDate: string;
}) {
  return (
    <aside className="lg:col-span-1 space-y-6" aria-labelledby="stats-heading">
      {/* Performance Card */}
      <Card className="bg-card border-border/80 rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <CardTitle
            id="stats-heading"
            className="text-base font-bold text-foreground flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4 text-primary" />
            Performance & Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Average Score */}
          <div>
            <div className="flex justify-between items-center text-sm mb-1.5">
              <span className="text-muted-foreground">Average Score</span>
              <span className="font-mono font-bold text-foreground">
                {averageScore.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.max(0, averageScore))}
              className="h-2 rounded-full"
            />
          </div>

          {/* Win & Completion Rate */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="text-lg font-bold font-mono text-foreground">
                {winRate}%
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Completion</p>
              <p className="text-lg font-bold font-mono text-foreground">
                {completionRate !== null ? `${completionRate}%` : "—"}
              </p>
            </div>
          </div>

          {/* Streaks */}
          <div className="space-y-2.5 pt-3 border-t border-border/60 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Current Streak
              </span>
              <span className="font-mono font-bold text-foreground">
                {player.streak ?? 0} {player.streak === 1 ? "quiz" : "quizzes"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-500" />
                Highest Streak
              </span>
              <span className="font-mono font-bold text-foreground">
                {highestStreak !== null ? `${highestStreak} quizzes` : "—"}
              </span>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="space-y-2.5 pt-3 border-t border-border/60 text-sm">
            <CategoryRow label="Best Category" value={bestCategory} />
            <CategoryRow label="Most Played" value={mostPlayedCategory} />
          </div>
        </CardContent>
      </Card>

      {/* Honors & Details Card */}
      <Card className="bg-card border-border/80 rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Honors & Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Global Rank</span>
            <span className="font-mono font-bold text-primary text-base">
              {player.rank ? `#${player.rank}` : "Unranked"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Title</span>
            <span className="font-medium text-foreground text-right">
              {summary?.levelTitleLocalised ?? "Quiz Cadet"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total XP</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {summary?.xpTotal !== undefined
                ? summary.xpTotal.toLocaleString()
                : "0"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Joined</span>
            <span className="font-medium text-foreground">{joinedDate}</span>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
});

const ProfilePage = () => {
  const params = useParams<{ name?: string; userId?: string }>();
  const routeName =
    typeof params?.userId === "string"
      ? params.userId
      : typeof params?.name === "string"
        ? params.name
        : "";

  const auth = useAuthSession();

  const {
    activeTab,
    handleTabChange,
    currentPlayer,
    averageScore,
    winRate,
    bestCategory,
    mostPlayedCategory,
    recentActivities,
    activity,
    quizzesTaken,
    quizzesCreated,
    quizzesTakenList,
    createdQuizzes,
    isQuizzesLoading,
    quizzesError,
    followers,
    following,
    analytics,
    isAnalyticsLoading,
    resolvedUserId,
    bundle: profileBundle,
    lookupError,
  } = usePublicProfilePage({ name: routeName });

  const isSelf = useMemo(() => {
    if (!auth.isAuthenticated || !auth.currentUser?.userId) return false;
    if (!resolvedUserId) return false;
    return (
      auth.currentUser.userId.toLowerCase() === resolvedUserId.toLowerCase()
    );
  }, [auth.isAuthenticated, auth.currentUser?.userId, resolvedUserId]);

  const completionRate = useMemo(() => {
    if (analytics) {
      if (
        typeof analytics.totalAttempts === "number" &&
        analytics.totalAttempts > 0 &&
        typeof analytics.uniquePlayers === "number"
      ) {
        return Math.round(
          (analytics.uniquePlayers / analytics.totalAttempts) * 100,
        );
      }
    }
    const bundleSummary = profileBundle.analytics?.summary;
    if (
      bundleSummary &&
      typeof bundleSummary.totalAttempts === "number" &&
      bundleSummary.totalAttempts > 0 &&
      typeof bundleSummary.completedQuizzes === "number"
    ) {
      return Math.round(
        (bundleSummary.completedQuizzes / bundleSummary.totalAttempts) * 100,
      );
    }
    return null;
  }, [analytics, profileBundle.analytics]);

  const highestStreak = profileBundle.summary?.longestStreak ?? null;

  const joinedDate = useMemo(() => {
    const raw =
      activity.items[0]?.at ?? profileBundle.summary?.createdAt ?? null;
    if (!raw) return "March 15, 2022";
    try {
      return new Date(raw).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "March 15, 2022";
    }
  }, [activity.items, profileBundle.summary?.createdAt]);

  const profileUsername =
    profileBundle.summary?.username ||
    (currentPlayer.name
      ? currentPlayer.name.replace(/\s+/g, "").toLowerCase()
      : routeName);

  const { copied, copy } = useClipboard(2000);
  const handleShare = useCallback(async () => {
    const profileUrl =
      typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentPlayer.name}'s Profile on QuizHub`,
          text: `Check out ${currentPlayer.name}'s profile and quizzes on QuizHub!`,
          url: profileUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    copy(profileUrl);
  }, [currentPlayer.name, copy]);

  if (profileBundle.notFound || lookupError?.status === 404) {
    return (
      <main
        data-testid="public-profile-page"
        className="min-h-[70vh] flex items-center justify-center p-6"
      >
        <Card className="max-w-md w-full text-center p-8 rounded-3xl border-border/80 shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            User Not Found
          </h1>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t find a user profile matching &ldquo;{routeName}
            &rdquo;. The user may have been deleted or the link might be
            incorrect.
          </p>
          <Button asChild className="rounded-xl mt-2">
            <Link href="/">Back to Home</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const quizzesCreatedCount =
    profileBundle.summary?.quizzesCreated ?? quizzesCreated;
  const quizzesTakenCount = profileBundle.summary?.quizzesTaken ?? quizzesTaken;
  const followersCount =
    profileBundle.summary?.followers ?? followers.users.length;
  const followingCount =
    profileBundle.summary?.following ?? following.users.length;

  return (
    <main
      data-testid="public-profile-page"
      className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12"
    >
      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="hover:bg-accent -ml-2 gap-2 text-muted-foreground hover:text-foreground rounded-xl"
        >
          <Link href="/" aria-label="Navigate back to home page">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="gap-2 rounded-xl border-border/80 hover:bg-accent"
          aria-label="Share profile"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Copied Link!
              </span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>Share Profile</span>
            </>
          )}
        </Button>
      </div>

      {/* Hero Header Section */}
      <ProfileHero
        player={currentPlayer}
        joinedDate={joinedDate}
        summary={profileBundle.summary}
        resolvedUserId={resolvedUserId}
        username={profileUsername}
        isSelf={isSelf}
      />

      {/* 4-Card Arcade Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Quizzes Created */}
        <Card className="p-4 bg-card border-border/80 hover:border-violet-500/40 transition-all rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Quizzes Created
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mb-1">
            {quizzesCreatedCount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {profileBundle.summary?.quizzesPublished ?? quizzesCreatedCount}{" "}
            published
          </div>
        </Card>

        {/* Card 2: Quizzes Taken */}
        <Card className="p-4 bg-card border-border/80 hover:border-emerald-500/40 transition-all rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Quizzes Taken
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mb-1">
            {quizzesTakenCount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Avg Score:{" "}
            <span className="font-mono font-medium">
              {averageScore.toFixed(0)}%
            </span>
          </div>
        </Card>

        {/* Card 3: Streak */}
        <Card className="p-4 bg-card border-border/80 hover:border-amber-500/40 transition-all rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Current Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Flame className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mb-1">
            {profileBundle.summary?.currentStreak ?? 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              days
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Best:{" "}
            <span className="font-mono font-medium">
              {highestStreak ?? profileBundle.summary?.currentStreak ?? 0} days
            </span>
          </div>
        </Card>

        {/* Card 4: Community */}
        <Card className="p-4 bg-card border-border/80 hover:border-indigo-500/40 transition-all rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Followers
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mb-1">
            {followersCount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Following:{" "}
            <span className="font-mono font-medium">{followingCount}</span>
          </div>
        </Card>
      </div>

      {/* Main Content Layout (2 cols: Tabs + Sticky Stats Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Interactive Tab System */}
        <section
          className="lg:col-span-2"
          aria-labelledby="profile-tabs-heading"
        >
          <h2 id="profile-tabs-heading" className="sr-only">
            {currentPlayer.name}&apos;s Profile Content
          </h2>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList
              className="bg-card border border-border/80 p-1.5 rounded-2xl w-full justify-start overflow-x-auto flex-nowrap scrollbar-none h-auto gap-1"
              aria-label="Profile sections"
            >
              <TabsTrigger
                value="activity"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="created"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all gap-1.5"
              >
                <span>Created Quizzes</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-mono rounded-full bg-muted/80"
                >
                  {quizzesCreatedCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="quizzes"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all gap-1.5"
              >
                <span>Quizzes Taken</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-mono rounded-full bg-muted/80"
                >
                  {quizzesTakenCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="followers"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all gap-1.5"
              >
                <span>Followers</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-mono rounded-full bg-muted/80"
                >
                  {followersCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all gap-1.5"
              >
                <span>Following</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-mono rounded-full bg-muted/80"
                >
                  {followingCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Activity */}
            <TabsContent value="activity" className="space-y-6 mt-6">
              {resolvedUserId === null ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-8 text-center" role="status">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Sign in as{" "}
                      <span className="font-mono font-medium text-foreground">
                        @{routeName}
                      </span>{" "}
                      to view this profile&apos;s full activity timeline.
                    </p>
                  </CardContent>
                </Card>
              ) : recentActivities.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-8 text-center" role="status">
                    <Clock className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-foreground font-medium mb-1">
                      No Recent Activity
                    </p>
                    <p className="text-muted-foreground text-sm">
                      This player hasn&apos;t generated any recent activity
                      events yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className="space-y-3"
                  role="list"
                  aria-label="Recent activities"
                >
                  {recentActivities.map((act, index) => (
                    <ActivityItem
                      key={`${act.title}-${index}`}
                      icon={act.icon}
                      title={act.title}
                      date={act.date}
                    />
                  ))}
                </div>
              )}

              {/* Featured Created Quizzes preview on Activity tab */}
              {createdQuizzes.length > 0 && (
                <div className="pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Featured Quizzes by {currentPlayer.name}
                    </h3>
                    {createdQuizzes.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTabChange("created")}
                        className="text-xs text-primary hover:text-primary/80 gap-1 rounded-xl"
                      >
                        <span>View all ({quizzesCreatedCount})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {createdQuizzes.slice(0, 2).map((quiz) => (
                      <QuizCard key={quiz.quizId} quiz={quiz} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Created Quizzes */}
            <TabsContent value="created" className="space-y-4 mt-6">
              {resolvedUserId === null ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    Sign in as <span className="font-mono">@{routeName}</span>{" "}
                    to view this profile&apos;s created quizzes.
                  </CardContent>
                </Card>
              ) : isQuizzesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card
                      key={i}
                      className="p-4 rounded-2xl animate-pulse space-y-3"
                    >
                      <div className="h-32 bg-muted rounded-xl" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </Card>
                  ))}
                </div>
              ) : quizzesError ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    <p>
                      Couldn&apos;t load created quizzes. Please try again
                      later.
                    </p>
                  </CardContent>
                </Card>
              ) : !auth.isAuthenticated &&
                quizzesCreatedCount > 0 &&
                createdQuizzes.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-12 text-center" role="status">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">
                      Sign in to view {currentPlayer.name}&apos;s quizzes
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                      {quizzesCreatedCount}{" "}
                      {quizzesCreatedCount === 1 ? "quiz" : "quizzes"}{" "}
                      available. Sign in to view and play!
                    </p>
                    <Button
                      asChild
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : createdQuizzes.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-12 text-center" role="status">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">
                      No Created Quizzes
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                      {isSelf
                        ? "You haven't created any quizzes yet. Share your knowledge with the QuizHub community!"
                        : "This player hasn't published any quizzes yet."}
                    </p>
                    {isSelf && (
                      <Button
                        asChild
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                      >
                        <Link href="/create-quiz">
                          <Sparkles className="w-4 h-4" />
                          Create First Quiz
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  role="list"
                  aria-label="Created quizzes"
                >
                  {createdQuizzes.map((quiz) => (
                    <QuizCard key={quiz.quizId} quiz={quiz} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Quizzes Taken */}
            <TabsContent value="quizzes" className="space-y-4 mt-6">
              {resolvedUserId === null ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    Sign in as <span className="font-mono">@{routeName}</span>{" "}
                    to view this profile&apos;s quizzes taken.
                  </CardContent>
                </Card>
              ) : isQuizzesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card
                      key={i}
                      className="p-4 rounded-2xl animate-pulse space-y-2"
                    >
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </Card>
                  ))}
                </div>
              ) : quizzesError ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    <p>
                      Couldn&apos;t load quizzes taken. Please try again later.
                    </p>
                  </CardContent>
                </Card>
              ) : quizzesTakenList.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-12 text-center" role="status">
                    <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">
                      No Quizzes Taken Yet
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                      {isSelf
                        ? "You haven't taken any quizzes yet. Explore topics and challenge yourself!"
                        : "This player hasn't completed any quizzes yet."}
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      className="gap-2 rounded-xl"
                    >
                      <Link href="/quizzes">
                        <BookOpen className="w-4 h-4" />
                        Explore Quizzes
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  role="list"
                  aria-label="Quizzes taken"
                >
                  {quizzesTakenList.map((quiz) => (
                    <QuizCard key={quiz.quizId} quiz={quiz} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 4: Followers */}
            <TabsContent value="followers" className="space-y-4 mt-6">
              {resolvedUserId === null ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    Sign in as <span className="font-mono">@{routeName}</span>{" "}
                    to view this profile&apos;s followers.
                  </CardContent>
                </Card>
              ) : followers.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 border rounded-2xl animate-pulse"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-muted rounded w-24" />
                        <div className="h-2.5 bg-muted rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : followers.error ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    <p>Couldn&apos;t load followers. Please try again later.</p>
                  </CardContent>
                </Card>
              ) : !auth.isAuthenticated &&
                followersCount > 0 &&
                followers.users.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-12 text-center" role="status">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">
                      Sign in to view followers
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                      {followersCount}{" "}
                      {followersCount === 1
                        ? "player follows"
                        : "players follow"}{" "}
                      {currentPlayer.name}. Sign in to connect!
                    </p>
                    <Button
                      asChild
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : followers.users.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-12 text-center" role="status">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">
                      No Followers Yet
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      When other players follow this profile, they will appear
                      here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  role="list"
                  aria-label="Followers list"
                >
                  {followers.users.map((user) => (
                    <Card
                      key={user.userId}
                      className="p-3 bg-card border-border/80 rounded-2xl hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/profile/${user.userName}`}
                          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity"
                        >
                          <Avatar className="h-10 w-10 border border-border">
                            {user.avatarUrl && (
                              <AvatarImage
                                src={user.avatarUrl}
                                alt={user.displayName ?? user.userName}
                              />
                            )}
                            <AvatarFallback className="text-xs font-bold">
                              {(user.displayName ?? user.userName)
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {user.displayName ?? user.userName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              @{user.userName}
                            </p>
                          </div>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Link href={`/profile/${user.userName}`}>View</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 5: Following */}
            <TabsContent value="following" className="space-y-4 mt-6">
              {resolvedUserId === null ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    Sign in as <span className="font-mono">@{routeName}</span>{" "}
                    to view this profile&apos;s following.
                  </CardContent>
                </Card>
              ) : following.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 border rounded-2xl animate-pulse"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-muted rounded w-24" />
                        <div className="h-2.5 bg-muted rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : following.error ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent
                    className="p-8 text-center text-muted-foreground"
                    role="status"
                  >
                    <p>Couldn&apos;t load following. Please try again later.</p>
                  </CardContent>
                </Card>
              ) : !auth.isAuthenticated &&
                followingCount > 0 &&
                following.users.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-12 text-center" role="status">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">
                      Sign in to view following
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                      {currentPlayer.name} follows {followingCount}{" "}
                      {followingCount === 1 ? "player" : "players"}. Sign in to
                      view!
                    </p>
                    <Button
                      asChild
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : following.users.length === 0 ? (
                <Card className="bg-card border-border/80 rounded-2xl">
                  <CardContent className="p-12 text-center" role="status">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-1">
                      Not Following Anyone
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      Players this user follows will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  role="list"
                  aria-label="Following list"
                >
                  {following.users.map((user) => (
                    <Card
                      key={user.userId}
                      className="p-3 bg-card border-border/80 rounded-2xl hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/profile/${user.userName}`}
                          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity"
                        >
                          <Avatar className="h-10 w-10 border border-border">
                            {user.avatarUrl && (
                              <AvatarImage
                                src={user.avatarUrl}
                                alt={user.displayName ?? user.userName}
                              />
                            )}
                            <AvatarFallback className="text-xs font-bold">
                              {(user.displayName ?? user.userName)
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {user.displayName ?? user.userName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              @{user.userName}
                            </p>
                          </div>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Link href={`/profile/${user.userName}`}>View</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Right Column: Sticky Stats & Honors Sidebar */}
        <StatsPanel
          averageScore={averageScore}
          winRate={winRate}
          player={currentPlayer}
          bestCategory={bestCategory}
          mostPlayedCategory={mostPlayedCategory}
          completionRate={completionRate}
          highestStreak={highestStreak}
          summary={profileBundle.summary}
          joinedDate={joinedDate}
        />
      </div>

      {/* Diagnostics — only rendered in development. The
          route slug, viewer's userId, and a one-line summary of the
          resolution help debug the username → userId mapper
          without changing the public surface. */}
      {process.env.NODE_ENV !== "production" && (
        <p className="sr-only" data-testid="profile-resolved-userId">
          resolvedUserId={resolvedUserId ?? "null"} analyticsLoading=
          {String(isAnalyticsLoading)} quizzesTaken={quizzesTaken}{" "}
          quizzesCreated=
          {quizzesCreated}
        </p>
      )}
    </main>
  );
};

export default memo(ProfilePage);
