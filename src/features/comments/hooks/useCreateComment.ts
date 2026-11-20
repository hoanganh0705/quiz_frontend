"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { isApiError, type ApiError } from "@/lib/api";
import { getUserCopy, type UserCopyEntry } from "@/lib/api/error-codes";
import { logger } from "@/shared/log";

import { createComment } from "@/features/comments/services/comments.service";
import { useCommentThreadLookup } from "@/features/comments/stores/useCommentThreadLookup";
import { commentsKey, commentThreadKey } from "@/features/comments/types";

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

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  void category;
  void data;
}

const COOLDOWN_SECONDS_DEFAULT = 60;

export function useCreateComment(
  quizId: string,
  options: UseCreateCommentOptions = {},
): UseCreateCommentResult {
  const { onSuccess, onError, onRateLimit } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const inFlightRef = useRef<Promise<CreatedComment | null> | null>(null);

  const lookup = useCommentThreadLookup(quizId);
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

      if (cooldownSeconds !== null && cooldownSeconds > 0) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      const startedAt = Date.now();
      const payload: CreateCommentDto = parentId
        ? { body, parentCommentId: parentId }
        : { body };

      const core = (async (): Promise<CreatedComment | null> => {
        try {
          const response = (await createComment(
            quizId,
            payload,
          )) as unknown as {
            data?: CreatedComment;
            commentId?: string;
          };

          const created: CreatedComment = {
            commentId: response.data?.commentId ?? response.commentId ?? "",
          };

          if (parentId) {
            lookup.incrementRepliesCount(parentId);
          }

          try {
            const qc = getQueryClient();
            await qc.invalidateQueries({
              predicate: (query) =>
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === "comments" &&
                query.queryKey[1] === quizId,
            });
            await qc.invalidateQueries({ queryKey: commentThreadKey(quizId) });
            await qc.invalidateQueries({ queryKey: commentsKey(quizId) });
            if (parentId) {
              await qc.invalidateQueries({
                queryKey: commentsKey(quizId, { parentId }),
              });
            }
          } catch {}

          emitBreadcrumb("comments:create-comment", {
            status: "success",
            durationMs: Date.now() - startedAt,
          });

          onSuccess?.(created);
          return created;
        } catch (err) {
          if (isApiError(err)) {
            if (err.status === 429) {
              const seconds = COOLDOWN_SECONDS_DEFAULT;
              setCooldownSeconds(seconds);
              const interval = setInterval(() => {
                setCooldownSeconds((prev) => {
                  if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    return null;
                  }
                  return prev - 1;
                });
              }, 1000);
              onRateLimit?.(seconds);

              emitBreadcrumb("comments:create-comment", {
                status: "cooldown",
                durationMs: Date.now() - startedAt,
                code: err.code,
              });
              return null;
            }

            setError(err);
            onError?.(err);

            emitBreadcrumb("comments:create-comment", {
              status: "error",
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            return null;
          }

          const wrapped = new Error(String(err));
          emitBreadcrumb("comments:create-comment", {
            status: "error",
            durationMs: Date.now() - startedAt,
            code: "GLOBAL_UNKNOWN",
          });
          logger.warn("comments.create", "unexpected rejection", {
            err,
            wrapped,
          });
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
    [quizId, lookup, cooldownSeconds, onSuccess, onError, onRateLimit],
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
