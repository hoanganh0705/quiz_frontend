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
import {
  getBookmarkStatus,
  removeBookmarkFromCollection,
} from "@/features/bookmarks/api";
import { bookmarkCollectionsKey } from "@/features/bookmarks/hooks/use-bookmark-collections";
import { bookmarkedQuizIdsKey } from "@/features/bookmarks/hooks/use-bookmarked-quiz-ids";
import { useUser } from "@/features/users/store/user-store";

export type UnbookmarkMutationOutcomeKind =
  "success" | "already_unbookmarked" | "reverted" | "unauthenticated";

export interface UnbookmarkMutationOutcome {
  kind: UnbookmarkMutationOutcomeKind;
  cause: unknown;
}

export interface UseUnbookmarkQuizResult {
  isPending: boolean;
  lastError: OptimisticToggleError | null;
  lastOutcome: UnbookmarkMutationOutcome | null;
  unbookmark: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS =
  bookmarkCollectionsKey() as unknown as readonly unknown[];

async function pushOptimisticBookmarkedQuizIdRemoval(
  quizId: string,
): Promise<void> {
  const qc = getQueryClient();
  qc.setQueriesData(
    { queryKey: ["bookmarked-quiz-ids"] },
    (current: unknown) => {
      const priorList: ReadonlyArray<{ quizId: string }> = Array.isArray(
        current,
      )
        ? (current as ReadonlyArray<{ quizId: string }>)
        : [];

      return priorList.filter((item) => item && item.quizId !== quizId);
    },
  );
}

async function rollbackOptimisticBookmarkedQuizIdRemoval(): Promise<void> {
  const qc = getQueryClient();
  await qc.invalidateQueries({ queryKey: ["bookmarked-quiz-ids"] });
}

export function useUnbookmarkQuiz(quizId: string): UseUnbookmarkQuizResult {
  const { isAuthenticated } = useAuthState();

  const currentUser = useUser();

  const [lastOutcome, setLastOutcome] =
    useState<UnbookmarkMutationOutcome | null>(null);

  const keysToInvalidate: readonly (readonly unknown[])[] =
    isAuthenticated && quizId
      ? [KEY_MEMBERSHIP, KEY_COLLECTIONS, ["bookmark-status", quizId]]
      : [];

  const wrappedToggle = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !quizId) {
      setLastOutcome({ kind: "unauthenticated", cause: null });
      return;
    }

    let statusCollections: ReadonlyArray<{ collectionId: string }> = [];
    try {
      const status = await getBookmarkStatus(quizId);
      const data = (
        status as unknown as {
          data?: { collections?: Array<{ collectionId: string }> };
        }
      )?.data;
      statusCollections = data?.collections ?? [];
    } catch {
      setLastOutcome({ kind: "reverted", cause: undefined });
      throw new Error("status fetch failed");
    }

    if (statusCollections.length === 0) {
      const qc = getQueryClient();
      await Promise.all(
        keysToInvalidate.map((key) => qc.invalidateQueries({ queryKey: key })),
      );

      if (currentUser?.userId) {
        broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
      setLastOutcome({ kind: "already_unbookmarked", cause: null });
      return;
    }

    await pushOptimisticBookmarkedQuizIdRemoval(quizId);

    try {
      await Promise.all(
        statusCollections.map((col) =>
          removeBookmarkFromCollection(col.collectionId, quizId),
        ),
      );

      if (currentUser?.userId) {
        broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
      setLastOutcome({ kind: "success", cause: null });
      return;
    } catch (cause: unknown) {
      if (isApiError(cause) && cause.status === 404) {
        if (currentUser?.userId) {
          broadcastBookmarksInvalidated({ userId: currentUser.userId });
        }
        setLastOutcome({ kind: "already_unbookmarked", cause: null });
        return;
      }

      await rollbackOptimisticBookmarkedQuizIdRemoval();
      setLastOutcome({ kind: "reverted", cause });
      throw cause;
    }
  }, [isAuthenticated, quizId, keysToInvalidate, currentUser]);

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: true,
    toggle: wrappedToggle,
    keysToInvalidate,
  });

  const unbookmark = useCallback(async (): Promise<void> => {
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
    unbookmark,
  };
}
