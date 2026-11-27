"use client";

import { useCallback, useRef, useState } from "react";

import { getQueryClient } from "@/providers/QueryProvider";

import { isApiError, type ApiError } from "@/lib/api";
import { getUserCopy, type UserCopyEntry } from "@/lib/api/error-codes";

import { logger } from "@/shared/log";

import { COMMENT_KEYS } from "@/features/comments/query-keys";
import {
  unvoteComment,
  voteComment,
} from "@/features/comments/services/comments.service";

import type {
  CommentUserVote,
  CommentVoteDirection,
} from "@/features/comments/types";

export interface UseVoteCommentOptions {
  quizId?: string;
  onSuccess?: (nextVote: CommentUserVote) => void;
  onError?: (error: ApiError) => void;
}

export interface UseVoteCommentResult {
  vote: (direction: CommentVoteDirection) => Promise<CommentUserVote | null>;
  unvote: () => Promise<CommentUserVote | null>;
  toggleVote: (
    direction: CommentVoteDirection,
    currentVote?: CommentUserVote,
  ) => Promise<CommentUserVote | null>;
  isLoading: boolean;
  error: ApiError | null;
  errorCopy: UserCopyEntry | null;
  resetError: () => void;
}

const COOLDOWN_MS = 500;

function nextVoteForToggle(
  direction: CommentVoteDirection,
  currentVote: CommentUserVote,
): CommentUserVote {
  if (currentVote === direction) {
    return null;
  }
  return direction;
}

export function useVoteComment(
  commentId: string,
  options: UseVoteCommentOptions = {},
): UseVoteCommentResult {
  const { quizId, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Promise<CommentUserVote | null> | null>(null);
  const lastInvocationRef = useRef<number>(0);

  const errorCopy = error ? getUserCopy(error.code) : null;

  const runVoteMutation = useCallback(
    async (
      run: () => Promise<unknown>,
      nextUserVote: CommentUserVote,
    ): Promise<CommentUserVote | null> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastInvocationRef.current < COOLDOWN_MS) {
        return null;
      }
      lastInvocationRef.current = now;

      setIsLoading(true);
      setError(null);

      const core = (async (): Promise<CommentUserVote | null> => {
        try {
          await run();

          try {
            const qc = getQueryClient();
            await qc.invalidateQueries({
              queryKey: quizId ? COMMENT_KEYS.byQuiz(quizId) : COMMENT_KEYS.all,
            });
          } catch {}

          onSuccess?.(nextUserVote);
          return nextUserVote;
        } catch (err) {
          try {
            const qc = getQueryClient();
            await qc.invalidateQueries({
              queryKey: quizId ? COMMENT_KEYS.byQuiz(quizId) : COMMENT_KEYS.all,
            });
          } catch {}

          if (isApiError(err)) {
            setError(err);
            onError?.(err);
            return null;
          }

          logger.warn("comments.vote", "unexpected rejection", err);
          return null;
        }
      })();

      inFlightRef.current = core;
      try {
        return await core;
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    },
    [quizId, onSuccess, onError],
  );

  const vote = useCallback(
    async (
      direction: CommentVoteDirection,
    ): Promise<CommentUserVote | null> =>
      runVoteMutation(
        () => voteComment(commentId, { value: direction }),
        direction,
      ),
    [commentId, runVoteMutation],
  );

  const unvote = useCallback(
    async (): Promise<CommentUserVote | null> =>
      runVoteMutation(() => unvoteComment(commentId), null),
    [commentId, runVoteMutation],
  );

  const toggleVote = useCallback(
    async (
      direction: CommentVoteDirection,
      currentVote?: CommentUserVote,
    ): Promise<CommentUserVote | null> => {
      const actualCurrent: CommentUserVote = currentVote ?? null;
      const next = nextVoteForToggle(direction, actualCurrent);
      if (next === null) {
        return unvote();
      }
      if (next !== direction) {
        return null;
      }
      return vote(direction);
    },
    [vote, unvote],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    vote,
    unvote,
    toggleVote,
    isLoading,
    error,
    errorCopy,
    resetError,
  };
}
