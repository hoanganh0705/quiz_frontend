"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  REPLY_CAP,
  commentThreadKey,
  type ThreadLookupEntry,
} from "@/features/comments/types";

type ThreadMap = Readonly<Record<string, ThreadLookupEntry>>;

function emptyMap(): ThreadMap {
  return Object.freeze({});
}

export interface UseCommentThreadLookup {
  getRepliesCount: (commentId: string) => number;
  isAtReplyCap: (commentId: string) => boolean;
  setRepliesCount: (commentId: string, count: number) => void;
  incrementRepliesCount: (commentId: string) => void;
  decrementRepliesCount: (commentId: string) => void;
}

export function useCommentThreadLookup(
  quizId: string | null,
): UseCommentThreadLookup {
  const key = useMemo(
    () => (quizId === null ? null : commentThreadKey(quizId)),
    [quizId],
  );

  const queryClient = getQueryClient();
  const query = useQuery<ThreadMap>(
    {
      queryKey: (key ?? [
        "__comment_thread_lookup_disabled__",
      ]) as readonly unknown[],
      queryFn: () => emptyMap(),
      initialData: emptyMap(),
      enabled: key !== null,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    queryClient,
  );
  const data = query.data;

  const write = useCallback(
    (updater: (prev: ThreadMap) => ThreadMap) => {
      if (key === null) return;
      try {
        const qc = getQueryClient();
        qc.setQueryData(key, (current: ThreadMap | undefined): ThreadMap => {
          const prev: ThreadMap = current ?? emptyMap();
          return updater(prev);
        });
      } catch {}
    },
    [key],
  );

  const setRepliesCount = useCallback(
    (commentId: string, count: number) => {
      const safeCount = Math.max(0, Math.floor(count));
      write((prev) =>
        Object.freeze({
          ...prev,
          [commentId]: Object.freeze({
            repliesCount: safeCount,
            replyCap: prev[commentId]?.replyCap ?? REPLY_CAP,
          }),
        }),
      );
    },
    [write],
  );

  const incrementRepliesCount = useCallback(
    (commentId: string) => {
      write((prev) => {
        const existing = prev[commentId];
        const currentCount = existing?.repliesCount ?? 0;
        return Object.freeze({
          ...prev,
          [commentId]: Object.freeze({
            repliesCount: currentCount + 1,
            replyCap: existing?.replyCap ?? REPLY_CAP,
          }),
        });
      });
    },
    [write],
  );

  const decrementRepliesCount = useCallback(
    (commentId: string) => {
      write((prev) => {
        const existing = prev[commentId];
        const currentCount = existing?.repliesCount ?? 0;
        return Object.freeze({
          ...prev,
          [commentId]: Object.freeze({
            repliesCount: Math.max(0, currentCount - 1),
            replyCap: existing?.replyCap ?? REPLY_CAP,
          }),
        });
      });
    },
    [write],
  );

  const getRepliesCount = useCallback(
    (commentId: string) => data?.[commentId]?.repliesCount ?? 0,
    [data],
  );

  const isAtReplyCap = useCallback(
    (commentId: string) => {
      const entry = data?.[commentId];
      const count = entry?.repliesCount ?? 0;
      const cap = entry?.replyCap ?? REPLY_CAP;
      return count >= cap;
    },
    [data],
  );

  return {
    getRepliesCount,
    isAtReplyCap,
    setRepliesCount,
    incrementRepliesCount,
    decrementRepliesCount,
  };
}
