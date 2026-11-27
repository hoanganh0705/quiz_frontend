"use client";

import { useCallback, useRef, useState } from "react";

import { isApiError, type ApiError } from "@/lib/api";
import { getUserCopy, type UserCopyEntry } from "@/lib/api/error-codes";
import { logger } from "@/shared/log";

import { reportComment } from "@/features/comments/services/comments.service";

import type { ReportCommentDtoReason } from "@/lib/api/generated/schemas";

export interface UseReportCommentOptions {
  onSuccess?: () => void;

  onError?: (error: ApiError) => void;
}

export interface UseReportCommentResult {
  report: (payload: {
    reason: ReportCommentDtoReason;
    description?: string;
  }) => Promise<boolean>;

  isLoading: boolean;

  reported: boolean;

  isAlreadyReported: boolean;

  error: ApiError | null;

  errorCopy: UserCopyEntry | null;

  clearReportSuccess: () => void;

  resetError: () => void;
}

export function useReportComment(
  commentId: string,
  options: UseReportCommentOptions = {},
): UseReportCommentResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [reported, setReported] = useState(false);
  const [isAlreadyReported, setIsAlreadyReported] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const errorCopy = error ? getUserCopy(error.code) : null;

  const handleReport = useCallback(
    async ({
      reason,
      description,
    }: {
      reason: ReportCommentDtoReason;
      description?: string;
    }): Promise<boolean> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      setIsAlreadyReported(false);
      setReported(false);

      const core = (async (): Promise<boolean> => {
        try {
          await reportComment(commentId, {
            reason,
            details: description,
          });
          setReported(true);
          onSuccess?.();
          return true;
        } catch (err) {
          if (isApiError(err)) {
            if (err.code === "COMMENT_DUPLICATE_REPORT") {
              setIsAlreadyReported(true);
              return true;
            }

            setError(err);
            onError?.(err);
            return false;
          }

          logger.warn("comments.report", "unexpected rejection", err);
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
    },
    [commentId, onSuccess, onError],
  );

  const clearReportSuccess = useCallback(() => {
    setReported(false);
    setIsAlreadyReported(false);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    report: handleReport,
    isLoading,
    reported,
    isAlreadyReported,
    error,
    errorCopy,
    clearReportSuccess,
    resetError,
  };
}
