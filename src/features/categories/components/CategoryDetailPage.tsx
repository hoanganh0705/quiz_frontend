"use client";

import { getQueryClient } from "@/providers/QueryProvider";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import {
  EntityDetailErrorState,
  EntityDetailNotFound,
} from "@/shared/ui/EntityDetailErrorState";
import { EntityFollowButtonSlot } from "@/shared/ui/EntityFollowButtonSlot";
import { EntityQuizGrid } from "@/shared/ui/EntityQuizGrid";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import {
  useCategory,
  useCategoryQuizzes,
} from "@/features/categories/hooks";
import { useFollowCategory } from "@/features/categories/hooks/useFollowCategory";
import { useIsFollowingCategory } from "@/features/categories/hooks/useIsFollowingCategory";
import { useUnfollowCategory } from "@/features/categories/hooks/useUnfollowCategory";
import { CATEGORY_KEYS } from "@/features/categories/query-keys";

import { CategoryEmptyState } from "./CategoryEmptyState";
import { CategoryHeader } from "./CategoryHeader";

import type { QuizListItemDto } from "@/lib/api/generated/schemas";

export interface CategoryDetailPageProps {
  idOrSlug: string;
}

export function CategoryDetailPage({
  idOrSlug,
}: CategoryDetailPageProps): React.ReactElement {
  const { category, isLoading, error, notFound } = useCategory(idOrSlug);
  const quizzes = useCategoryQuizzes(idOrSlug, {});

  const categoryId = category?.categoryId ?? null;
  const { isAuthenticated } = useAuthState();
  const { isFollowing, isLoading: isFollowingLoading } =
    useIsFollowingCategory(categoryId);
  const {
    isPending: isFollowPending,
    lastError: followError,
    follow,
  } = useFollowCategory(categoryId);
  const {
    isPending: isUnfollowPending,
    lastError: unfollowError,
    unfollow,
  } = useUnfollowCategory(categoryId);

  if (notFound) {
    return (
      <EntityDetailNotFound
        entityTitle="Category"
        entityNoun="category"
        browseHref="/categories"
        browseLabel="Browse Categories"
        testId="category-detail-page-not-found"
      />
    );
  }

  if (error) {
    return (
      <EntityDetailErrorState
        entityNoun="category"
        testId="category-detail-page-server-error"
        retryTestId="category-detail-page-retry"
        onRetry={() =>
          void getQueryClient().invalidateQueries({
            queryKey: CATEGORY_KEYS.detail(idOrSlug),
          })
        }
      />
    );
  }

  if (isLoading || !category) {
    return (
      <div
        className={PAGE_CONTAINER_CLASS}
        data-testid="category-detail-page-loading"
      >
        <CategoryHeader title="\u00A0" description={null} />
        <EntityQuizGrid
          items={quizzes.items as readonly QuizListItemDto[]}
          isLoading={quizzes.isLoading}
          isLoadingMore={quizzes.isLoadingMore}
          hasMore={quizzes.hasMore}
          loadMore={quizzes.loadMore}
          error={quizzes.error}
          refresh={quizzes.refresh}
          retryBannerVisible={quizzes.retryBannerVisible}
          emptyState={<CategoryEmptyState variant="quizzes-in-category" />}
          entityNoun="category"
          testIdPrefix="category-quiz-grid"
          skeletonCount={12}
        />
      </div>
    );
  }

  return (
    <div
      className={PAGE_CONTAINER_CLASS}
      data-testid="category-detail-page"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CategoryHeader
          title={category.name}
          description={category.description}
          quizCount={category.quizCount}
        />
        <EntityFollowButtonSlot
          entityId={category.categoryId}
          testId="category-follow-button-slot"
          isAuthenticated={isAuthenticated}
          isFollowing={isFollowing}
          isLoading={isFollowingLoading}
          isPending={isFollowPending || isUnfollowPending}
          errorKind={(followError ?? unfollowError)?.kind ?? null}
          followerCount={category.followerCount}
          onFollow={follow}
          onUnfollow={unfollow}
        />
      </div>
      <EntityQuizGrid
        items={quizzes.items as readonly QuizListItemDto[]}
        isLoading={quizzes.isLoading}
        isLoadingMore={quizzes.isLoadingMore}
        hasMore={quizzes.hasMore}
        loadMore={quizzes.loadMore}
        error={quizzes.error}
        refresh={quizzes.refresh}
        retryBannerVisible={quizzes.retryBannerVisible}
        emptyState={<CategoryEmptyState variant="quizzes-in-category" />}
        entityNoun="category"
        testIdPrefix="category-quiz-grid"
      />
    </div>
  );
}
