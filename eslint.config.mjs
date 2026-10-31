import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/use-memo": "off",
      "@next/next/no-html-link-for-pages": "warn",

      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message:
                "Import from '@/lib/api' instead of 'axios' directly. " +
                "The lib/api barrel owns the HTTP surface; only " +
                "src/lib/api/** is allowed to depend on axios.",
            },
          ],
          patterns: [
            {
              group: ["axios/*"],
              message:
                "Import from '@/lib/api' instead of submodules of axios. " +
                "Use the re-exported customInstance / authOnlyInstance / " +
                "orvalCustomInstance from the barrel.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/api/**/*"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  {
    files: ["src/features/**/*", "src/app/(public)/**/*"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='data'][property.name='pagination']",
          message:
            "Reading 'data.pagination' in a feature or public page bypasses the " +
            "useCursorPaginated hook (Epic 3.2). Move the read into the fetcher " +
            "adapter at the SDK boundary; the rest of the component must consume " +
            "the hook's { items, hasMore, loadMore, … } result.",
        },
        {
          selector:
            "MemberExpression[object.name='meta'][property.name='pagination']",
          message:
            "Reading 'meta.pagination' in a feature or public page bypasses the " +
            "useCursorPaginated hook (Epic 3.2). Move the read into the fetcher " +
            "adapter at the SDK boundary; the rest of the component must consume " +
            "the hook's { items, hasMore, loadMore, … } result.",
        },
        {
          selector: "Identifier[name='nextCursor']",
          message:
            "Using 'nextCursor' directly in a feature or public page bypasses the " +
            "useCursorPaginated hook (Epic 3.2). The hook owns cursor handling; " +
            "consume the hook's { items, hasMore, loadMore, refresh } result " +
            "instead. The only allowed read is inside a fetcher adapter that " +
            "translates the SDK envelope to the hook's CursorPage shape.",
        },
      ],
    },
  },
  {
    files: [
      "src/features/quizzes/components/QuizCatalogMainContent.tsx",
      "src/features/quizzes/types/quiz-backend.ts",
      "src/features/categories/hooks/useCategoryQuizzes.ts",
      "src/features/tags/hooks/useTagQuizzes.ts",
      "src/features/tags/hooks/useTagsDirectory.ts",
      "src/features/quizzes/hooks/useQuizzesList.ts",
      "src/features/daily-challenge/types/dto.ts",
      "src/features/daily-challenge/hooks/__tests__/useDailyChallengeHistory.spec.tsx",
      "src/features/daily-challenge/hooks/useDailyChallengeHistory.ts",
      "src/features/daily-challenge/services/daily-challenge.service.ts",
      "src/features/daily-challenge/services/__tests__/daily-challenge.service.spec.ts",
      "src/features/daily-challenge/wrappers/daily-challenge.wrapper.ts",
      "src/features/quizzes/hooks/useMyQuizzes.ts",
      "src/features/quizzes/hooks/useMyQuizzesDrafts.ts",
      "src/features/quizzes/hooks/useMyQuizzesPublished.ts",
      "src/features/quizzes/types/my-quizzes.ts",
      "src/features/comments/hooks/useQuizComments.ts",
      "src/features/comments/hooks/__tests__/useQuizComments.spec.tsx",
      "src/features/reviews/hooks/useQuizReviews.ts",
      "src/features/reviews/hooks/__tests__/useQuizReviews.spec.tsx",
      "src/features/reviews/types/review.types.ts",
      "src/features/reviews/hooks/useCompletedQuizAttempt.ts",
      "src/features/reviews/hooks/__tests__/useCompletedQuizAttempt.spec.tsx",
      "src/features/reviews/hooks/useReviewGate.ts",
      "src/features/reviews/hooks/__tests__/useHelpfulReview.spec.tsx",
      "src/features/instances/hooks/useInstancePlayers.ts",
      "src/features/instances/types/instance.types.ts",
      "src/features/instances/hooks/__tests__/useInstancePlayers.spec.tsx",
      "src/features/social/hooks/useFollowers.ts",
      "src/features/social/hooks/useFollowing.ts",
      "src/features/social/hooks/useFriends.ts",
      "src/features/social/hooks/useBlockedUsers.ts",
      "src/features/social/hooks/useIncomingRequests.ts",
      "src/features/social/hooks/useOutgoingRequests.ts",
      "src/features/social/hooks/__tests__/d3-read-hooks.spec.tsx",
      "src/features/social/types/relationship.ts",
      "src/features/social/dto-adapters.ts",
      "src/features/social/__tests__/dto-adapters.spec.ts",
      "src/features/social/services/mutuals.service.ts",

      "src/features/social/services/activity.service.ts",
      "src/features/social/hooks/useMutualFriends.ts",
      "src/features/social/hooks/useMutualFollowers.ts",
      "src/features/social/hooks/useUserActivity.ts",

      "src/features/social/services/__tests__/mutuals.service.spec.ts",
      "src/features/social/services/__tests__/activity.service.spec.ts",

      "src/features/social/hooks/__tests__/useMutualFriends.spec.tsx",
      "src/features/social/hooks/__tests__/useMutualFollowers.spec.tsx",
      "src/features/social/hooks/__tests__/useUserActivity.spec.tsx",

      "src/features/admin/services/review-moderation.service.ts",
      "src/features/admin/services/comment-moderation.service.ts",
      "src/features/admin/review-moderation/hooks/useReviewReports.ts",
      "src/features/admin/comment-moderation/hooks/useCommentReports.ts",
      "src/features/admin/review-moderation/hooks/__tests__/useReviewReports.spec.tsx",
      "src/features/admin/comment-moderation/hooks/__tests__/useCommentReports.spec.tsx",
      "src/features/admin/services/__tests__/review-moderation.service.spec.ts",
      "src/features/admin/services/__tests__/comment-moderation.service.spec.ts",
      "src/features/social/services/feed.service.ts",

      "src/features/social/services/__tests__/feed.service.spec.ts",

      "src/features/social/hooks/__tests__/useFeed.spec.tsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];

export default eslintConfig;
