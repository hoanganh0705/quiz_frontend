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
import { useFollowTag } from "@/features/tags/hooks/useFollowTag";
import { useIsFollowingTag } from "@/features/tags/hooks/useIsFollowingTag";
import { useTagBySlug } from "@/features/tags/hooks/useTagBySlug";
import { useTagQuizzes } from "@/features/tags/hooks/useTagQuizzes";
import { useUnfollowTag } from "@/features/tags/hooks/useUnfollowTag";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { RelatedTagsStrip } from "./RelatedTagsStrip";
import { TagAnalyticsPanel } from "./TagAnalyticsPanel";
import { TagEmptyState } from "./TagEmptyState";
import { TagHeader } from "./TagHeader";

import type { QuizListItemDto } from "@/lib/api/generated/schemas";

const PAGE_LOADING_TESTID = "tag-detail-page-loading";
const PAGE_NOT_FOUND_TESTID = "tag-detail-page-not-found";
const PAGE_ERROR_TESTID = "tag-detail-page-server-error";
const PAGE_RESOLVED_TESTID = "tag-detail-page";

export interface TagDetailPageProps {
  slug: string;
}

export function TagDetailPage({
  slug,
}: TagDetailPageProps): React.ReactElement {
  const { tag, isLoading, error, notFound } = useTagBySlug(slug);
  const canonicalSlug = tag?.slug || slug;
  const quizzes = useTagQuizzes(canonicalSlug, {});

  const tagId = tag?.tagId ?? null;
  const { isAuthenticated } = useAuthState();
  const { isFollowing, isLoading: isFollowingLoading } = useIsFollowingTag(tagId);
  const {
    isPending: isFollowPending,
    lastError: followError,
    follow,
  } = useFollowTag(tagId);
  const {
    isPending: isUnfollowPending,
    lastError: unfollowError,
    unfollow,
  } = useUnfollowTag(tagId);

  if (notFound) {
    return (
      <EntityDetailNotFound
        entityTitle="Tag"
        entityNoun="tag"
        browseHref="/tags"
        browseLabel="Browse Tags"
        testId={PAGE_NOT_FOUND_TESTID}
      />
    );
  }

  if (error) {
    return (
      <EntityDetailErrorState
        entityNoun="tag"
        testId={PAGE_ERROR_TESTID}
        retryTestId="tag-detail-page-retry"
        onRetry={() =>
          void getQueryClient().invalidateQueries({
            queryKey: TAG_KEYS.detail(slug),
          })
        }
      />
    );
  }

  if (isLoading || !tag) {
    return (
      <div className={PAGE_CONTAINER_CLASS} data-testid={PAGE_LOADING_TESTID}>
        <div
          className="mb-8"
          aria-label="Loading tag header"
          aria-busy="true"
          data-testid="tag-detail-page-header-skeleton"
        >
          <div className="h-8 w-48 animate-pulse rounded bg-accent" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-accent" />
        </div>
        <div
          className="mb-8 h-32 animate-pulse rounded-xl bg-accent"
          aria-label="Loading tag analytics"
          aria-busy="true"
          data-testid="tag-detail-page-analytics-skeleton"
        />
        <div
          className="h-96 animate-pulse rounded-xl bg-accent"
          aria-label="Loading tag quizzes"
          aria-busy="true"
          data-testid="tag-detail-page-grid-skeleton"
        />
      </div>
    );
  }

  return (
    <div className={PAGE_CONTAINER_CLASS} data-testid={PAGE_RESOLVED_TESTID}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <TagHeader tag={tag} />
        <EntityFollowButtonSlot
          entityId={tag.tagId}
          testId="tag-follow-button-slot"
          isAuthenticated={isAuthenticated}
          isFollowing={isFollowing}
          isLoading={isFollowingLoading}
          isPending={isFollowPending || isUnfollowPending}
          errorKind={(followError ?? unfollowError)?.kind ?? null}
          followerCount={tag.followerCount}
          onFollow={follow}
          onUnfollow={unfollow}
        />
      </div>
      <TagAnalyticsPanel id={tag.tagId} className="mb-8" />
      <EntityQuizGrid
        items={quizzes.items as readonly QuizListItemDto[]}
        isLoading={quizzes.isLoading}
        isLoadingMore={quizzes.isLoadingMore}
        hasMore={quizzes.hasMore}
        loadMore={quizzes.loadMore}
        error={quizzes.error}
        refresh={quizzes.refresh}
        retryBannerVisible={quizzes.retryBannerVisible}
        emptyState={<TagEmptyState variant="quizzes-by-tag" />}
        entityNoun="tag"
        testIdPrefix="tag-quiz-grid"
      />
      <RelatedTagsStrip slug={canonicalSlug} />
    </div>
  );
}
