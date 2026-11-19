"use client";

import { useCallback, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  type OptimisticToggleError,
  isApiError,
  useOptimisticToggle,
} from "@/lib/api";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { broadcastBookmarksInvalidated } from "@/lib/api/core/bookmarks-broadcast-channel";
import { addBookmark } from "@/features/bookmarks/api";
import { bookmarkCollectionsKey } from "@/features/bookmarks/hooks/use-bookmark-collections";
import {
  buildBookmarkedQuizIdSet,
  bookmarkedQuizIdsKey,
} from "@/features/bookmarks/hooks/use-bookmarked-quiz-ids";
import { useDefaultCollectionId } from "@/features/bookmarks/hooks/use-default-collection-id";
import { useUser } from "@/features/users/store/user-store";

export type BookmarkMutationOutcomeKind =
  | "success"
  | "already_bookmarked"
  | "no_collection"
  | "reverted"
  | "unauthenticated";

export interface BookmarkMutationOutcome {
  kind: BookmarkMutationOutcomeKind;
  cause: unknown;
}

export interface UseBookmarkQuizResult {
  isPending: boolean;
  lastError: OptimisticToggleError | null;
  lastOutcome: BookmarkMutationOutcome | null;
  bookmark: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS =
  bookmarkCollectionsKey() as unknown as readonly unknown[];

async function pushOptimisticBookmarkedQuizIds(quizId: string): Promise<void> {
  const qc = getQueryClient();
  qc.setQueriesData(
    { queryKey: ["bookmarked-quiz-ids"] },
    (current: unknown) => {
      const priorList = Array.isArray(current) ? current : [];
      return [
        ...priorList,
        {
          bookmarkId: `optimistic-${quizId}`,
          quizId,
          quizTitle: "",
          quizSlug: "",
          quizImageUrl: null,
          quizIsFeatured: false,
          notes: null,
          bookmarkedAt: new Date().toISOString(),
        },
      ];
    },
  );
}

async function rollbackOptimisticBookmarkedQuizIds(): Promise<void> {
  const qc = getQueryClient();
  await qc.invalidateQueries({ queryKey: ["bookmarked-quiz-ids"] });
}

export function useBookmarkQuiz(quizId: string): UseBookmarkQuizResult {
  const { isAuthenticated } = useAuthState();
  const { defaultCollectionId, isLoading: defaultCollectionLoading } =
    useDefaultCollectionId();

  const currentUser = useUser();

  const [lastOutcome, setLastOutcome] =
    useState<BookmarkMutationOutcome | null>(null);

  const keysToInvalidate: readonly (readonly unknown[])[] =
    isAuthenticated && quizId
      ? [KEY_MEMBERSHIP, KEY_COLLECTIONS, ["bookmark-status", quizId]]
      : [];

  const wrappedToggle = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !quizId) {
      setLastOutcome({ kind: "unauthenticated", cause: null });
      return;
    }

    if (!defaultCollectionLoading && defaultCollectionId === null) {
      setLastOutcome({ kind: "no_collection", cause: null });
      return;
    }

    if (defaultCollectionLoading || defaultCollectionId === null) {
      setLastOutcome({ kind: "no_collection", cause: null });
      return;
    }

    await pushOptimisticBookmarkedQuizIds(quizId);

    try {
      await addBookmark(defaultCollectionId, { quizId });

      if (currentUser?.userId) {
        broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
      setLastOutcome({ kind: "success", cause: null });
      return;
    } catch (cause: unknown) {
      if (isApiError(cause) && cause.status === 409) {
        if (currentUser?.userId) {
          broadcastBookmarksInvalidated({ userId: currentUser.userId });
        }
        setLastOutcome({ kind: "already_bookmarked", cause: null });
        return;
      }

      await rollbackOptimisticBookmarkedQuizIds();
      setLastOutcome({ kind: "reverted", cause });
      throw cause;
    }
  }, [
    isAuthenticated,
    quizId,
    defaultCollectionId,
    defaultCollectionLoading,
    currentUser,
  ]);

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: false,
    toggle: wrappedToggle,
    keysToInvalidate,
  });

  const bookmark = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !quizId) {
      setLastOutcome({ kind: "unauthenticated", cause: null });
      return NOOP();
    }
    await toggle();
  }, [isAuthenticated, quizId, toggle]);

  return {
    isPending: status === "pending",
    lastError,
    lastOutcome,
    bookmark,
  };
}

export { buildBookmarkedQuizIdSet };
