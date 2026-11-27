"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { isApiError, type ApiError } from "@/lib/api";
import { getUserCopy, type UserCopyEntry } from "@/lib/api/error-codes";
import { logger } from "@/shared/log";

import { COMMENT_KEYS } from "@/features/comments/query-keys";
import { deleteComment } from "@/features/comments/services/comments.service";

export interface UseDeleteCommentOptions {
  quizId?: string;

  parentId?: string | null;

  onSuccess?: () => void;

  onError?: (error: ApiError) => void;
}

export interface UseDeleteCommentResult {
  deleteComment: () => Promise<boolean>;

  isLoading: boolean;

  error: ApiError | null;

  errorCopy: UserCopyEntry | null;

  resetError: () => void;
}

export function useDeleteComment(
  commentId: string,
  options: UseDeleteCommentOptions = {},
): UseDeleteCommentResult {
  const { quizId, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const errorCopy = error ? getUserCopy(error.code) : null;

  const handleDelete = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setIsLoading(true);
    setError(null);

    const core = (async (): Promise<boolean> => {
      try {
        await deleteComment(commentId);

        try {
          const qc = getQueryClient();
          await qc.invalidateQueries({
            queryKey: quizId ? COMMENT_KEYS.byQuiz(quizId) : COMMENT_KEYS.all,
          });
        } catch {}

        onSuccess?.();
        return true;
      } catch (err) {
        if (isApiError(err)) {
          setError(err);
          onError?.(err);
          return false;
        }

        logger.warn("comments.delete", "unexpected rejection", err);
        return false;
      }
    })();

    inFlightRef.current = core;
    try {
      return await core;
    } finally {
      setIsLoading(false);
      inFlightRef.current = null;
    }
  }, [commentId, quizId, onSuccess, onError]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    deleteComment: handleDelete,
    isLoading,
    error,
    errorCopy,
    resetError,
  };
}
