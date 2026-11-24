"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Coins,
  Compass,
  Crown,
  Flame,
  Gem,
  GraduationCap,
  History,
  Lock,
  Medal,
  Rocket,
  Shield,
  Sparkles,
  Swords,
  Target,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/loading-states/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ApiError } from "@/lib/api";
import type { BadgeTier } from "@/features/achievements/types";

export interface TierVisualConfig {
  label: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  chipActive: string;
  cardBorder: string;
  cardHoverGlow: string;
  iconBg: string;
  icon: typeof Award;
}

export const TIER_CONFIG: Record<BadgeTier, TierVisualConfig> = {
  BRONZE: {
    label: "Bronze",
    textColor: "text-amber-700 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
    badgeBorder: "border-amber-600/30 dark:border-amber-500/30",
    chipActive: "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:text-white",
    cardBorder: "border-border hover:border-amber-500/40",
    cardHoverGlow: "hover:shadow-amber-500/5",
    iconBg: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300/40 dark:border-amber-700/40",
    icon: Medal,
  },
  SILVER: {
    label: "Silver",
    textColor: "text-slate-600 dark:text-slate-300",
    badgeBg: "bg-slate-500/10 dark:bg-slate-500/15",
    badgeBorder: "border-slate-400/30 dark:border-slate-500/30",
    chipActive: "bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900",
    cardBorder: "border-border hover:border-slate-400/50",
    cardHoverGlow: "hover:shadow-slate-400/5",
    iconBg: "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600/60",
    icon: Shield,
  },
  GOLD: {
    label: "Gold",
    textColor: "text-amber-600 dark:text-yellow-400",
    badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    badgeBorder: "border-yellow-500/40 dark:border-yellow-400/30",
    chipActive: "bg-amber-500 text-slate-950 hover:bg-amber-600 font-semibold dark:bg-yellow-400 dark:text-slate-950",
    cardBorder: "border-border hover:border-yellow-500/50",
    cardHoverGlow: "hover:shadow-yellow-500/10",
    iconBg: "bg-amber-50 dark:bg-yellow-950/50 text-amber-600 dark:text-yellow-400 border border-amber-300/50 dark:border-yellow-600/40",
    icon: Trophy,
  },
  PLATINUM: {
    label: "Platinum",
    textColor: "text-cyan-700 dark:text-cyan-300",
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    badgeBorder: "border-cyan-500/40 dark:border-cyan-400/30",
    chipActive: "bg-cyan-700 text-white hover:bg-cyan-800 font-semibold dark:bg-cyan-500 dark:text-slate-950",
    cardBorder: "border-border hover:border-cyan-500/50",
    cardHoverGlow: "hover:shadow-cyan-500/10",
    iconBg: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300/50 dark:border-cyan-600/40",
    icon: Sparkles,
  },
  DIAMOND: {
    label: "Diamond",
    textColor: "text-brand dark:text-violet-300",
    badgeBg: "bg-brand/10 dark:bg-brand/20",
    badgeBorder: "border-brand/40 dark:border-brand/50",
    chipActive: "bg-brand text-white hover:bg-brand/90 font-semibold shadow-sm dark:bg-brand dark:text-white",
    cardBorder: "border-border hover:border-brand/60",
    cardHoverGlow: "hover:shadow-brand/15",
    iconBg: "bg-violet-50 dark:bg-violet-950/60 text-brand dark:text-violet-300 border border-violet-300/60 dark:border-violet-600/50 shadow-sm",
    icon: Gem,
  },
};

export const TIER_COLOR: Record<BadgeTier, string> = {
  BRONZE: TIER_CONFIG.BRONZE.textColor,
  SILVER: TIER_CONFIG.SILVER.textColor,
  GOLD: TIER_CONFIG.GOLD.textColor,
  PLATINUM: TIER_CONFIG.PLATINUM.textColor,
  DIAMOND: TIER_CONFIG.DIAMOND.textColor,
};

export function getBadgeIconComponent(
  name?: string | null,
  description?: string | null,
  code?: string | null,
) {
  const combined = `${name ?? ""} ${description ?? ""} ${code ?? ""}`.toLowerCase();

  // Streak & consistency
  if (
    combined.includes("streak") ||
    combined.includes("on a roll") ||
    combined.includes("warrior") ||
    combined.includes("flame") ||
    combined.includes("daily")
  ) {
    return Flame;
  }

  // XP & points
  if (
    combined.includes("xp") ||
    combined.includes("point") ||
    combined.includes("coins")
  ) {
    if (combined.includes("collector") || combined.includes("coins")) {
      return Coins;
    }
    return Zap;
  }

  // Tournaments & competitions
  if (
    combined.includes("tournament") ||
    combined.includes("battle") ||
    combined.includes("duel") ||
    combined.includes("arena")
  ) {
    return Swords;
  }

  // Global champion / rank #1 / winning
  if (
    combined.includes("champion") ||
    combined.includes("winner") ||
    combined.includes("rank #1") ||
    combined.includes("top of the weekly")
  ) {
    return Trophy;
  }

  // Perfection / precision
  if (
    combined.includes("perfectionist") ||
    combined.includes("perfect score") ||
    combined.includes("accuracy") ||
    combined.includes("bullseye")
  ) {
    return Target;
  }

  // Elite / top tiers
  if (
    combined.includes("elite") ||
    combined.includes("expert") ||
    combined.includes("top 10") ||
    combined.includes("top 100")
  ) {
    return Medal;
  }

  // First steps / getting started
  if (
    combined.includes("first steps") ||
    combined.includes("getting started") ||
    combined.includes("first quiz")
  ) {
    return combined.includes("getting started") ? Rocket : Compass;
  }

  // Pass / passer / performer
  if (
    combined.includes("pass") ||
    combined.includes("performer") ||
    combined.includes("complete 5")
  ) {
    return CheckCircle2;
  }

  // Quizzing & knowledge
  if (
    combined.includes("quiz master") ||
    combined.includes("scholar")
  ) {
    return GraduationCap;
  }
  if (
    combined.includes("enthusiast") ||
    combined.includes("quiz") ||
    combined.includes("trivia") ||
    combined.includes("study") ||
    combined.includes("book")
  ) {
    return BookOpen;
  }

  // Speed & time
  if (
    combined.includes("speed") ||
    combined.includes("fast") ||
    combined.includes("blitz") ||
    combined.includes("quick") ||
    combined.includes("timer")
  ) {
    return Timer;
  }

  // Social & friends
  if (
    combined.includes("social") ||
    combined.includes("friend") ||
    combined.includes("community") ||
    combined.includes("share")
  ) {
    return Users;
  }

  // Master / Crown
  if (combined.includes("master") || combined.includes("crown") || combined.includes("legend")) {
    return Crown;
  }

  return Award;
}

interface BadgeCardSkeletonProps {
  className?: string;
}

export function BadgeCardSkeleton({ className }: BadgeCardSkeletonProps) {
  return (
    <div
      data-testid="badge-card-skeleton"
      className={`flex items-center gap-3.5 rounded-xl border border-border bg-card/60 p-3.5 shadow-xs ${className ?? ""}`}
    >
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <Skeleton className="h-3 w-16 shrink-0" />
    </div>
  );
}

interface BadgeGallerySkeletonProps {
  count?: number;
  className?: string;
}

export function BadgeGallerySkeleton({
  count = 6,
  className,
}: BadgeGallerySkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading badge catalog"
      data-testid="badge-gallery-skeleton"
      className={`space-y-6 ${className ?? ""}`}
    >
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/40">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 sm:w-20 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: count }).map((_, i) => (
            <BadgeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface BadgeDetailSkeletonProps {
  className?: string;
}

export function BadgeDetailSkeleton({ className }: BadgeDetailSkeletonProps) {
  return (
    <div
      data-testid="badge-detail-skeleton"
      className={`space-y-5 ${className ?? ""}`}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>
        <div className="space-y-1 text-right">
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-5 w-20 ml-auto" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

interface EarnedBadgeListSkeletonProps {
  count?: number;
  className?: string;
}

export function EarnedBadgeListSkeleton({
  count = 4,
  className,
}: EarnedBadgeListSkeletonProps) {
  return (
    <div
      data-testid="earned-badge-list-skeleton"
      className={`space-y-3 ${className ?? ""}`}
    >
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-xl border border-border bg-card/60 p-3.5 shadow-xs"
          >
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface AchievementHistorySkeletonProps {
  count?: number;
  className?: string;
}

export function AchievementHistorySkeleton({
  count = 6,
  className,
}: AchievementHistorySkeletonProps) {
  return (
    <div
      data-testid="achievement-history-skeleton"
      className={`space-y-3 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-xl border border-border bg-card/60 p-3 shadow-xs"
          >
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AchievementEmptyStateProps {
  variant: "catalog" | "earned" | "history";
  className?: string;
}

const ACHIEVEMENT_EMPTY_CONFIG = {
  catalog: {
    icon: Sparkles,
    title: "No badges available",
    description:
      "The badge catalog is currently empty. Check back later for new achievements to earn.",
  },
  earned: {
    icon: Award,
    title: "No badges earned yet",
    description:
      "Complete quizzes, participate in tournaments, and engage with the community to earn your first badge.",
  },
  history: {
    icon: History,
    title: "No achievement history yet",
    description:
      "Your earned badges will appear here once you start collecting achievements.",
  },
} as const;

export function AchievementEmptyState({
  variant,
  className,
}: AchievementEmptyStateProps) {
  const config = ACHIEVEMENT_EMPTY_CONFIG[variant];
  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      size="sm"
      className={className}
      data-testid={`achievement-empty-${variant}`}
    />
  );
}

interface AchievementErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export function AchievementErrorState({
  error,
  onRetry,
  className,
}: AchievementErrorStateProps) {
  const code = String(error?.code ?? "");
  const variant =
    error?.status === 0
      ? "network"
      : error?.status && error.status >= 500
        ? "server"
        : "default";
  return (
    <ErrorState
      variant={variant}
      onRetry={onRetry}
      className={className}
      data-testid={`achievement-error-${code || "default"}`}
      title={error ? "Could not load achievement data" : undefined}
      message={error ? error.detail || error.message || undefined : undefined}
    />
  );
}

interface UnauthenticatedAchievementsCtaProps {
  tab: "earned" | "history";
  className?: string;
}

export function UnauthenticatedAchievementsCta({
  tab,
  className,
}: UnauthenticatedAchievementsCtaProps) {
  const isHistory = tab === "history";
  return (
    <div
      data-testid="achievements-unauthenticated-cta"
      className={`rounded-xl border border-border bg-card/80 p-8 text-center backdrop-blur-xs shadow-xs ${className ?? ""}`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
        <Lock className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-bold tracking-tight">
        {isHistory ? "Track Your Achievement Timeline" : "Unlock and Track Your Badges"}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        {isHistory
          ? "Sign in to inspect your chronological unlock timeline, milestone records, and earned rewards."
          : "Sign in to track your personal trophy collection, build streaks, unlock rare diamond badges, and earn rewards."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="default">
          <Link href={`/login?returnUrl=/achievements?tab=${tab}`}>
            Sign In to QuizHub
          </Link>
        </Button>
        <Button asChild variant="outline" size="default">
          <Link href="/register">Create an Account</Link>
        </Button>
      </div>
    </div>
  );
}
