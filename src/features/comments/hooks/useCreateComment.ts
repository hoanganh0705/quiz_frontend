"use client";

import { useCallback, useRef, useState } from "react";

import { getQueryClient } from "@/providers/QueryProvider";

import { isApiError, type ApiError } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";
import { getUserCopy, type UserCopyEntry } from "@/lib/api/error-codes";

import { useCooldownTimer } from "@/shared/hooks/use-cooldown-timer";
import { logger } from "@/shared/log";

import { COMMENT_KEYS } from "@/features/comments/query-keys";
import { createComment } from "@/features/comments/services/comments.service";

import type { CreateCommentDto } from "@/lib/api/generated/schemas";

export interface UseCreateCommentOptions {
  onSuccess?: (comment: CreatedComment) => void;
  onError?: (error: ApiError) => void;
  onRateLimit?: (seconds: number) => void;
}

export interface CreatedComment {
  commentId: string;
}

export interface UseCreateCommentResult {
  createComment: (payload: {
    body: string;
    parentId?: string;
  }) => Promise<CreatedComment | null>;
  isLoading: boolean;
  error: ApiError | null;
  errorCopy: UserCopyEntry | null;
  cooldownSeconds: number | null;
  resetError: () => void;
}

const COOLDOWN_SECONDS_DEFAULT = 60;

export function useCreateComment(
  quizId: string,
  options: UseCreateCommentOptions = {},
): UseCreateCommentResult {
  const { onSuccess, onError, onRateLimit } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const cooldown = useCooldownTimer();
  const inFlightRef = useRef<Promise<CreatedComment | null> | null>(null);

  const cooldownSeconds = cooldown.isActive ? cooldown.remainingSeconds : null;
  const errorCopy = error ? getUserCopy(error.code) : null;

  const handleCreate = useCallback(
    async ({
      body,
      parentId,
    }: {
      body: string;
      parentId?: string;
    }): Promise<CreatedComment | null> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      if (cooldown.isActive) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      const payload: CreateCommentDto = parentId
        ? { body, parentCommentId: parentId }
        : { body };

      const core = (async (): Promise<CreatedComment | null> => {
        try {
          const response = await createComment(quizId, payload);
          const unwrapped = inspectEnvelope<{
            id?: string;
            commentId?: string;
          }>(response);
          const payloadData =
            unwrapped.kind === "envelope"
              ? unwrapped.value
              : unwrapped.kind === "passthrough"
                ? (unwrapped.value as { id?: string; commentId?: string })
                : null;

          const created: CreatedComment = {
            commentId: payloadData?.id ?? payloadData?.commentId ?? "",
          };

          try {
            const qc = getQueryClient();
            await qc.invalidateQueries({
              queryKey: COMMENT_KEYS.byQuiz(quizId),
            });
          } catch {}

          onSuccess?.(created);
          return created;
        } catch (err) {
          if (isApiError(err)) {
            if (err.status === 429) {
              cooldown.start(COOLDOWN_SECONDS_DEFAULT * 1000);
              onRateLimit?.(COOLDOWN_SECONDS_DEFAULT);
              return null;
            }

            setError(err);
            onError?.(err);
            return null;
          }

          logger.warn("comments.create", "unexpected rejection", { err });
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
    [quizId, cooldown, onSuccess, onError, onRateLimit],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createComment: handleCreate,
    isLoading,
    error,
    errorCopy,
    cooldownSeconds,
    resetError,
  };
}
