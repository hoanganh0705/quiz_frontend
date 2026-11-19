"use client";

import { useEffect } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { subscribeToBookmarkEvents } from "@/lib/api/core/bookmarks-broadcast-channel";
import { bookmarkCollectionsKey } from "@/features/bookmarks/hooks/use-bookmark-collections";
import {
  bookmarkedQuizIdsKey,
  useBookmarkedQuizIds,
} from "@/features/bookmarks/hooks/use-bookmarked-quiz-ids";
import { useUser } from "@/features/users/store/user-store";

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS =
  bookmarkCollectionsKey() as unknown as readonly unknown[];

export function BookmarksLookupHydrator(): null {
  useBookmarkedQuizIds();

  const currentUser = useUser();
  const currentUserId = currentUser?.userId ?? null;

  useEffect(() => {
    if (currentUserId === null) {
      return undefined;
    }

    const unsubscribe = subscribeToBookmarkEvents((event) => {
      if (event.type !== "bookmarks/invalidated") {
        return;
      }

      if (event.userId !== currentUserId) {
        return;
      }

      const qc = getQueryClient();
      void Promise.all([
        qc.invalidateQueries({ queryKey: KEY_MEMBERSHIP }),
        qc.invalidateQueries({ queryKey: KEY_COLLECTIONS }),
      ]);
    });

    return unsubscribe;
  }, [currentUserId]);

  return null;
}
