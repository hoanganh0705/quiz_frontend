/**
 * `quizzesBundle` GraphQL document.
 *
 * Single GraphQL query that replaces the five REST reads the `/quizzes`
 * directory page used to fan out (categories ranked, tags popular, popular
 * quizzes, trending quizzes, filtered quizzes list). The backend resolver
 * resolves `tagSlugs` to identifiers server-side, which removes the
 * client-side `listTags` round-trip.
 *
 * The fields are kept tight on purpose: the directory grid only needs the
 * rail slices and the first page of items, so the resolver's per-request
 * DataLoader batching kicks in without asking for fields the UI does not
 * render.
 *
 * After `pnpm generate:graphql`, the `QuizzesBundleQuery` and
 * `QuizzesBundleQueryVariables` types come from
 * `src/lib/graphql/generated/graphql.ts`. Until that file is generated the
 * document still compiles and runs (Apollo only needs the runtime
 * `DocumentNode`); the wrapper hook types will surface a TS error so a
 * developer is forced to run codegen before consuming the hook.
 */
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

import type {
  QuizzesBundleQuery,
  QuizzesBundleQueryVariables,
} from '@/lib/graphql/generated/graphql';

export type {
  QuizzesBundleQuery,
  QuizzesBundleQueryVariables,
} from '@/lib/graphql/generated/graphql';

export const QUIZZES_BUNDLE_QUERY: TypedDocumentNode<
  QuizzesBundleQuery,
  QuizzesBundleQueryVariables
> = gql`
  query QuizzesBundle(
    $q: String
    $sort: QuizSortOrder
    $difficulty: QuizDifficultyFilter
    $categoryId: ID
    $tagSlugs: [String!]
    $cursor: String
    $limit: Int
  ) {
    quizzesBundle(
      q: $q
      sort: $sort
      difficulty: $difficulty
      categoryId: $categoryId
      tagSlugs: $tagSlugs
      cursor: $cursor
      limit: $limit
    ) {
      items {
        quizId
        title
        slug
        imageUrl
        questionCount
        averageRating
        reviewCount
        attemptCount
        difficulty {
          label
        }
        category {
          categoryId
          name
          slug
        }
        tags {
          tagId
          name
          slug
        }
      }
      pageInfo {
        limit
        nextCursor
        hasNextPage
      }
      popular {
        rank
        quizId
        title
        slug
        imageUrl
        popularityScore
        totalAttempts
      }
      trending {
        rank
        quizId
        title
        slug
        imageUrl
        trendingScore
        totalAttempts
      }
      categories {
        rank
        categoryId
        name
        slug
      }
      tags {
        rank
        tagId
        name
        slug
      }
    }
  }
`;

export interface UseQuizzesBundleArgs {
  readonly variables?: QuizzesBundleQueryVariables;
  readonly fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache';
  readonly skip?: boolean;
}

export function useQuizzesBundleQuery(args: UseQuizzesBundleArgs = {}) {
  const { variables, fetchPolicy, skip } = args;
  if (typeof skip === 'boolean') {
    return useQuery(QUIZZES_BUNDLE_QUERY, {
      ...(variables ? { variables } : {}),
      ...(fetchPolicy ? { fetchPolicy } : {}),
      skip,
    });
  }
  if (fetchPolicy) {
    return useQuery(QUIZZES_BUNDLE_QUERY, {
      ...(variables ? { variables } : {}),
      fetchPolicy,
    });
  }
  if (variables) {
    return useQuery(QUIZZES_BUNDLE_QUERY, { variables });
  }
  return useQuery(QUIZZES_BUNDLE_QUERY);
}
