/**
 * `userProfile` GraphQL document.
 *
 * Single GraphQL query that backs the public `/profile/[name]` page.
 *
 * The page renders five distinct surfaces (summary header, activity
 * timeline, quizzes taken, created quizzes, followers/following rails)
 * that the previous implementation fetched through seven parallel
 * REST hooks plus the `userProfileBundle` REST endpoint. The backend
 * resolver already returns the same fields over GraphQL and degrades
 * the auth-gated ones to `null` for anonymous callers, so this one
 * query replaces every fan-out on this page.
 *
 * Auth-gated fields (`analytics`, `xpHistory`, `recentActivity`,
 * `wallet`, `followers`, `following`, `activity`) are wrapped in
 * `@include(if: $includeAnalytics)` / `@include(if: $includeFollowers)`
 * directives so the server only resolves the field for the viewer
 * classes that are allowed to see it. The directives are preferred
 * over branching at the resolver layer because (a) the wire payload
 * stays small for anonymous readers (no `followers` connection at
 * all when `includeFollowers: false`) and (b) the page can keep a
 * single document.
 *
 * Pagination arguments on the social rails (`followers`, `following`,
 * `activity`) are exposed as variables so the same document covers
 * both the initial page render and any later "load more" fetches.
 *
 * After `pnpm generate:graphql`, the `UserProfileQuery` and
 * `UserProfileQueryVariables` types come from
 * `src/lib/graphql/generated/graphql.ts`. Until that file is generated
 * the document still compiles and runs; the wrapper hook types will
 * surface a TS error so a developer is forced to run codegen before
 * consuming the hook.
 */
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

import type {
  UserProfileQuery,
  UserProfileQueryVariables,
} from '@/lib/graphql/generated/graphql';

export type {
  UserProfileQuery,
  UserProfileQueryVariables,
} from '@/lib/graphql/generated/graphql';

export const USER_PROFILE_QUERY: TypedDocumentNode<
  UserProfileQuery,
  UserProfileQueryVariables
> = gql`
  query UserProfile(
    $username: String!
    $includeAnalytics: Boolean!
    $includeFollowers: Boolean!
    $followersFirst: Int
    $followingFirst: Int
    $activityFirst: Int
  ) {
    userProfile(username: $username) {
      summary {
        userId
        username
        displayName
        avatarUrl
        bio
        country
        countryCode
        bgImageUrl
        createdAt
        updatedAt
        xpTotal
        level
        currentLevelXP
        nextLevelXP
        xpProgressPercent
        levelTitle
        levelTitleLocalised
        currentStreak
        longestStreak
        quizzesCreated
        quizzesPublished
        quizzesTaken
        followers
        following
        friends
        coinBalance
      }
      analytics @include(if: $includeAnalytics) {
        userId
        summary {
          totalAttempts
          completedQuizzes
          averageScore
        }
        favoriteCategory {
          id
          name
        }
        favoriteTag {
          id
          name
        }
        lastUpdated
      }
      xpHistory @include(if: $includeAnalytics) {
        bucket
        unit
        points {
          date
          value
        }
      }
      recentActivity @include(if: $includeAnalytics) {
        eventId
        eventType
        createdAt
        metadataKeys
      }
      wallet @include(if: $includeAnalytics) {
        balance
        createdAt
        updatedAt
        lastTransactionAt
        earnedToday
        dailyEarnCap
      }
      followers(first: $followersFirst) @include(if: $includeFollowers) {
        items {
          userId
          username
          avatarUrl
          followedAt
        }
        pageInfo {
          limit
          nextCursor
          hasNextPage
        }
      }
      following(first: $followingFirst) @include(if: $includeFollowers) {
        items {
          userId
          username
          avatarUrl
          followedAt
        }
        pageInfo {
          limit
          nextCursor
          hasNextPage
        }
      }
      activity(first: $activityFirst) @include(if: $includeFollowers) {
        items {
          id
          type
          occurredAt
          actor {
            userId
            username
            displayName
            avatarUrl
          }
        }
        pageInfo {
          limit
          nextCursor
          hasNextPage
        }
      }
    }
  }
`;

/**
 * Page sizes for the social rails when the page is the first paint.
 * The backend clamps to its own ceiling (see backend resolver) but the
 * client-side default is wider to fit the side rail.
 */
export const USER_PROFILE_DEFAULT_FOLLOWERS_FIRST = 50;
export const USER_PROFILE_DEFAULT_FOLLOWING_FIRST = 50;
export const USER_PROFILE_DEFAULT_ACTIVITY_FIRST = 30;

export interface UseUserProfileArgs {
  readonly variables: UserProfileQueryVariables;
  readonly fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache';
  readonly skip?: boolean;
}

export function useUserProfileQuery(args: UseUserProfileArgs) {
  const { variables, fetchPolicy, skip } = args;
  if (typeof skip === 'boolean') {
    return useQuery(USER_PROFILE_QUERY, {
      variables,
      ...(fetchPolicy ? { fetchPolicy } : {}),
      skip,
    });
  }
  if (fetchPolicy) {
    return useQuery(USER_PROFILE_QUERY, { variables, fetchPolicy });
  }
  return useQuery(USER_PROFILE_QUERY, { variables });
}
