"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, getComments } from "@/lib/api";

import { commentIdKey, commentIdKeyMatcher } from "./commentIdKeys";
import { validateCommentId } from "../comment-id-validation";

export interface UseCommentParams {
  commentId: string;

  enabled?: boolean;
}

export interface UseCommentResult {
  comment: unknown | null;
  isLoading: boolean;
  error: ApiError | null;
  outcome: "pending" | "success" | "not-found" | "forbidden" | "reverted";
  refresh: () => Promise<unknown>;
  mutate: (
    next: unknown | ((prev: unknown | null) => unknown),
  ) => Promise<unknown>;
}

function makeNotFoundError(): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: "AxiosError",
    message: "COMMENT_NOT_FOUND",
    config: undefined,
    request: undefined,
    response: {
      status: 404,
      data: {
        status: 404,
        detail: "COMMENT_NOT_FOUND",
        title: "COMMENT_NOT_FOUND",
        extensions: {
          code: "COMMENT_NOT_FOUND",
          requestId: "client-validation",
        },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<(typeof ApiError)["fromAxios"]>[0]);
}

function classifyError(apiError: ApiError): UseCommentResult["outcome"] {
  const code = apiError.code;
  if (code === "COMMENT_NOT_FOUND") return "not-found";
  if (code === "GLOBAL_FORBIDDEN") return "forbidden";
  return "reverted";
}

export function useComment(params: UseCommentParams): UseCommentResult {
  const { commentId, enabled = true } = params;

  const isValid = useMemo(() => validateCommentId(commentId).ok, [commentId]);

  const key = useMemo<readonly unknown[]>(() => {
    return commentIdKey(commentId);
  }, [commentId]);

  const fetcher = useCallback(async (): Promise<unknown> => {
    if (!isValid) {
      throw makeNotFoundError();
    }
    const sdk = getComments();
    return sdk.getComment(commentId);
  }, [isValid, commentId]);

  const queryKey = key;

  const { data, error, isLoading } = useQuery<unknown, ApiError>(
    {
      queryKey,
      queryFn: fetcher,
      enabled: enabled && isValid,
      refetchOnWindowFocus: false,
      retry: false,
    },
    getQueryClient(),
  );

  const outcome: UseCommentResult["outcome"] = useMemo(() => {
    if (!isValid) return "not-found";
    if (!enabled) return "pending";
    if (!error) {
      return data === undefined ? "pending" : "success";
    }
    return classifyError(error);
  }, [isValid, enabled, error, data]);

  const refresh = useCallback(async () => {
    if (!isValid) return makeNotFoundError();
    const sdk = getComments();
    const next = await sdk.getComment(commentId);
    getQueryClient().setQueryData(queryKey, next);
    return next;
  }, [isValid, commentId, queryKey]);

  const mutate = useCallback(
    async (
      next: unknown | ((prev: unknown | null) => unknown),
    ): Promise<unknown> => {
      const qc = getQueryClient();
      if (typeof next === "function") {
        const updater = next as (prev: unknown | null) => unknown;
        return qc.setQueryData(queryKey, updater);
      }
      return qc.setQueryData(queryKey, next);
    },
    [queryKey],
  );

  return {
    comment: data ?? null,
    isLoading: enabled && isValid && isLoading && data === undefined,
    error: error ?? null,
    outcome,
    refresh,
    mutate,
  };
}

export { commentIdKeyMatcher };
