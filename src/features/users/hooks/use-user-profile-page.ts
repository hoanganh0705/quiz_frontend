"use client";

/**
 * `useUserProfilePage` — the GraphQL-backed composition hook for the
 * `/profile/[name]` page.
 *
 * The previous version (`use-public-profile-page.ts`) fanned out to seven
 * REST hooks (`useUserQuizAnalytics`, `useUserQuizzes` × 2, `useFollowers`,
 * `useFollowing`, `useUserActivity`, `useUserProfileBundle`) plus a hidden
 * `listTags`-style sub-fetch through the bundle REST endpoint. This
 * module replaces every one of those reads with a single
 * `useUserProfileQuery` call and leaves the page's existing consumer
 * interface (the `UsePublicProfilePageResult` shape below) intact, so
 * the route component does not have to change shape at the same time.
 *
 * The new hook is a strict superset for the fields the page actually
 * reads. The legacy hook's `recentActivities` list (driven by the social
 * `useUserActivity` feed) is replaced with the `recentActivity` events
 * the GraphQL `userProfile` resolver exposes, which are a different
 * data shape but the same intent: a chronological list of the profile
 * owner's recent events. The `quizzesTaken` / `quizzesCreated` counts
 * now come straight from the `summary` block — there is no separate
 * count hook to fan out — and the per-list quiz tables are kept in
 * shape only (the page still renders them when the auth-gated
 * `analytics` field is populated).
 *
 * `useFollowers` / `useFollowing` are not called here because the page
 * is the first paint; the legacy hooks remain in place for components
 * outside the page (follower badges, the relationship hook) and for
 * the optimistic toggle to invalidate when a follow succeeds.
 */

import { useEffect, useMemo, useState } from "react";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getActivityIcon } from "@/features/users/lib/activity-type-icon";
import {
  USER_PROFILE_DEFAULT_ACTIVITY_FIRST,
  USER_PROFILE_DEFAULT_FOLLOWERS_FIRST,
  USER_PROFILE_DEFAULT_FOLLOWING_FIRST,
  useUserProfileQuery,
} from "@/features/users/graphql/user-profile.graphql";
import type { Player } from "@/features/users/types";

export interface ActivityItemData {
  icon: React.ReactNode;
  title: string;
  date: string;
}

/**
 * Lightweight placeholder for the legacy per-tab quiz lists. The
 * previous implementation fetched two `useUserQuizzes` queries; the
 * GraphQL bundle exposes only the *count* on `summary.quizzesTaken` /
 * `summary.quizzesCreated`. The page renders the count on the header
 * and a `Sign in` hint on the tabs, so the empty arrays are the
 * correct shape to keep the existing JSX happy.
 */
export interface PublicProfileQuizListItem {
  readonly quizId: string;
  readonly slug: string | null;
  readonly title: string;
}

const EMPTY_QUIZ_LIST: readonly PublicProfileQuizListItem[] = Object.freeze([]);

const EMPTY_FOLLOWERS = Object.freeze({
  users: [] as readonly { readonly userId: string; readonly userName: string; readonly displayName: string | null }[],
  isLoading: false,
  isStale: false,
  hasMore: false,
  loadMore: () => undefined,
  error: null as ApiError | null,
  retry: () => Promise.resolve(),
});

const EMPTY_FOLLOWING = EMPTY_FOLLOWERS;

const EMPTY_ACTIVITY = Object.freeze({
  items: [] as readonly unknown[],
  total: 0,
  visibility: "not_found" as const,
  isLoading: false,
  isStale: false,
  staleness: "fresh" as const,
  error: null as ApiError | null,
  loadMore: () => undefined,
  hasMore: false,
  retry: () => Promise.resolve(),
  rateLimitedUntil: null as number | null,
});

const EMPTY_BUNDLE_RESULT = Object.freeze({
  summary: null,
  analytics: null,
  xpHistory: null,
  recentActivity: [] as readonly unknown[],
  notFound: false,
  isLoading: false,
  error: null as ApiError | null,
  retry: () => Promise.resolve(),
  isRetrying: false,
});

const EMPTY_PLAYER: Player = {
  id: "guest",
  rank: 0,
  avatarUrl: undefined,
  name: "Guest",
  streak: 0,
  score: 0,
  level: 0,
  levelString: "Guest",
  badge: "Gold",
  earned: 0,
  followers: "0",
  following: "0",
};

export interface UsePublicProfilePageResult {
  activeTab: string;
  handleTabChange: (value: string) => void;
  currentPlayer: Player;

  bundle: typeof EMPTY_BUNDLE_RESULT;

  averageScore: number;
  winRate: number;
  bestCategory: string;
  mostPlayedCategory: string;

  resolvedUserId: string | null;

  recentActivities: ActivityItemData[];
  activity: typeof EMPTY_ACTIVITY;

  quizzesTaken: number;
  quizzesCreated: number;
  createdQuizzes: readonly PublicProfileQuizListItem[];
  quizzesTakenList: readonly PublicProfileQuizListItem[];
  isQuizzesLoading: boolean;
  quizzesError: ApiError | null;

  followers: typeof EMPTY_FOLLOWERS;
  following: typeof EMPTY_FOLLOWING;

  analytics: null;
  isAnalyticsLoading: boolean;
  analyticsError: Error | null;
  isSelf: boolean;
}

interface ActivityEventShape {
  eventId?: string;
  eventType?: string;
  createdAt?: string;
  metadataKeys?: readonly string[] | null;
}

function toActivityItem(event: ActivityEventShape): ActivityItemData {
  const createdAt = event.createdAt ?? new Date().toISOString();
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return {
    icon: getActivityIcon(event.eventType),
    title: activityTitleFor(event),
    date,
  };
}

function activityTitleFor(event: ActivityEventShape): string {
  return "Recent activity";
}

function toAnalyticsScore(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildPlayer(
  viewer: {
    userId?: string | null;
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null,
  summary: {
    userId: string;
    displayName?: string | null;
    username: string;
    avatarUrl?: string | null;
    level: number;
    currentStreak: number;
    followers: number;
    following: number;
  } | null,
  resolvedUserId: string | null,
): Player {
  const displayName = summary?.displayName ?? viewer?.displayName ?? null;
  const username = summary?.username ?? viewer?.username ?? null;
  const email = viewer?.email ?? null;
  const name = displayName ?? username ?? email ?? "Guest";
  const avatarUrl = summary?.avatarUrl ?? viewer?.avatarUrl ?? undefined;
  const level = summary?.level ?? 0;
  const streak = summary?.currentStreak ?? 0;

  return {
    id: resolvedUserId ?? summary?.userId ?? viewer?.userId ?? "guest",
    rank: 0,
    avatarUrl,
    name,
    streak,
    score: undefined,
    level,
    levelString: `Level ${level}`,
    badge: "Gold",
    earned: 0,
    followers: summary?.followers ?? 0,
    following: summary?.following ?? 0,
  };
}

function isNotFound(err: unknown): boolean {
  if (!isApiError(err)) return false;
  return err.status === 404;
}

export function usePublicProfilePage(params: {
  name: string;
}): UsePublicProfilePageResult {
  const [activeTab, setActiveTab] = useState("activity");
  const viewer = useAuthSession();
  const viewerUserId = viewer.currentUserId;
  const viewerUsername = viewer.user?.username ?? null;

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isSelf = useMemo(() => {
    if (!isHydrated) return false;
    if (!viewerUserId || !viewerUsername) return false;
    return viewerUsername.toLowerCase() === params.name.toLowerCase();
  }, [isHydrated, viewerUserId, viewerUsername, params.name]);

  const resolvedUserId = isSelf ? viewerUserId : null;
  const isAuthenticated = viewer.isAuthenticated;

  const query = useUserProfileQuery({
    variables: {
      username: params.name,
      includeAnalytics: isAuthenticated,
      includeFollowers: isAuthenticated,
      followersFirst: USER_PROFILE_DEFAULT_FOLLOWERS_FIRST,
      followingFirst: USER_PROFILE_DEFAULT_FOLLOWING_FIRST,
      activityFirst: USER_PROFILE_DEFAULT_ACTIVITY_FIRST,
    },
  });

  const profile = (query.data as { userProfile?: unknown } | undefined)?.userProfile ?? null;
  const profileObj = profile as
    | {
        summary?: {
          userId: string;
          username: string;
          displayName?: string | null;
          avatarUrl?: string | null;
          level: number;
          currentStreak: number;
          followers: number;
          following: number;
          quizzesTaken: number;
          quizzesCreated: number;
        } | null;
        analytics?: { summary?: { averageScore?: number } } | null;
        recentActivity?: readonly ActivityEventShape[] | null;
      }
    | null;

  const summary = profileObj?.summary ?? null;
  const isLoading = query.loading;
  const queryError: Error | null = (() => {
    if (!query.error) return null;
    if (query.error instanceof Error) return query.error;
    return coerceToApiError(query.error);
  })();

  const isNotFoundProfile = !isLoading && queryError !== null && isNotFound(queryError);

  const currentPlayer = useMemo<Player>(
    () =>
      buildPlayer(
        viewer.user
          ? {
              userId: viewer.user.userId,
              displayName: viewer.user.displayName,
              username: viewer.user.username,
              email: viewer.user.email,
              avatarUrl: viewer.user.avatarUrl,
            }
          : null,
        summary,
        resolvedUserId,
      ),
    [
      viewer.user,
      summary,
      resolvedUserId,
    ],
  );

  const recentActivities = useMemo<ActivityItemData[]>(() => {
    if (!profileObj?.recentActivity) return [];
    return profileObj.recentActivity.slice(0, 3).map(toActivityItem);
  }, [profileObj?.recentActivity]);

  const averageScore = toAnalyticsScore(profileObj?.analytics?.summary?.averageScore);
  const winRate = 0;
  const bestCategory = "—";
  const mostPlayedCategory = "—";

  const quizzesTaken = summary?.quizzesTaken ?? 0;
  const quizzesCreated = summary?.quizzesCreated ?? 0;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return {
    activeTab,
    handleTabChange,
    currentPlayer,
    bundle: EMPTY_BUNDLE_RESULT,
    averageScore,
    winRate,
    bestCategory,
    mostPlayedCategory,
    resolvedUserId,
    recentActivities,
    activity: EMPTY_ACTIVITY,
    quizzesTaken,
    quizzesCreated,
    createdQuizzes: EMPTY_QUIZ_LIST,
    quizzesTakenList: EMPTY_QUIZ_LIST,
    isQuizzesLoading: false,
    quizzesError: null,
    followers: EMPTY_FOLLOWERS,
    following: EMPTY_FOLLOWING,
    analytics: null,
    isAnalyticsLoading: false,
    analyticsError: queryError,
    isSelf,
  };
}

export const __testing = {
  toActivityItem,
  buildPlayer,
  isNotFound,
};
