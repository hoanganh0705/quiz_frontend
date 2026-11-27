"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

import {
  isReviewListPageForQuiz,
  REVIEW_KEYS,
} from "@/features/reviews/query-keys";
import {
  markReviewHelpful,
  unmarkReviewHelpful,
} from "@/features/reviews/services/reviews.service";
import type { ReviewDto } from "@/features/reviews/types";

import type { CursorPage } from "@/lib/api/use-cursor-paginated.types";

export interface UseHelpfulReviewParams {
  quizId: string;

  reviewId: string;

  initialViewerMarkedHelpful: boolean;
}

export interface UseHelpfulReviewResult {
  toggle: () => Promise<void>;

  isPending: boolean;

  viewerMarkedHelpful: boolean;

  lastError: ApiError | null;

  reset: () => void;
}

const COOLDOWN_MS = 500;

function applyCountDeltaToPage(
  page: CursorPage<ReviewDto>,
  reviewId: string,
  delta: number,
): CursorPage<ReviewDto> {
  let touched = false;
  const nextItems = page.items.map((item): ReviewDto => {
    if (item.reviewId !== reviewId) return item;
    touched = true;
    const next = Math.max(0, item.helpfulCount + delta);
    return { ...item, helpfulCount: next };
  });

  if (!touched) return page;
  return { ...page, items: nextItems };
}

async function applyOptimisticCountDelta(
  quizId: string,
  reviewId: string,
  delta: number,
): Promise<void> {
  try {
    const qc = getQueryClient();
    qc.setQueriesData(
      { predicate: (query) => isReviewListPageForQuiz(query.queryKey, quizId) },
      (current: unknown): unknown => {
        if (!current || typeof current !== "object") return current;
        const record = current as {
          pages?: unknown;
          items?: unknown;
        };
        if (Array.isArray(record.pages)) {
          return {
            ...record,
            pages: record.pages.map((p) =>
              applyCountDeltaToPage(
                p as CursorPage<ReviewDto>,
                reviewId,
                delta,
              ),
            ),
          };
        }
        if (Array.isArray(record.items)) {
          return applyCountDeltaToPage(
            record as CursorPage<ReviewDto>,
            reviewId,
            delta,
          );
        }
        return current;
      },
    );
  } catch {}
}

async function revalidateReviewListPages(quizId: string): Promise<void> {
  try {
    const qc = getQueryClient();
    await qc.invalidateQueries({
      queryKey: REVIEW_KEYS.byQuiz(quizId),
    });
  } catch {}
}

export function useHelpfulReview(
  params: UseHelpfulReviewParams,
): UseHelpfulReviewResult {
  const { quizId, reviewId, initialViewerMarkedHelpful } = params;

  const [viewerMarkedHelpful, setViewerMarkedHelpful] = useState<boolean>(
    initialViewerMarkedHelpful,
  );
  const [isPending, setIsPending] = useState(false);
  const [lastError, setLastError] = useState<ApiError | null>(null);

  const lastInvocationRef = useRef<number>(0);

  const previousMarkedRef = useRef<boolean>(initialViewerMarkedHelpful);

  const handleToggle = useCallback(async (): Promise<void> => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastInvocationRef.current < COOLDOWN_MS) {
      return;
    }
    lastInvocationRef.current = now;

    if (!quizId || !reviewId) {
      return;
    }

    previousMarkedRef.current = viewerMarkedHelpful;
    const nextMarked = !viewerMarkedHelpful;

    setViewerMarkedHelpful(nextMarked);
    setLastError(null);
    setIsPending(true);

    const delta = nextMarked ? 1 : -1;
    await applyOptimisticCountDelta(quizId, reviewId, delta);

    try {
      if (nextMarked) {
        await markReviewHelpful(reviewId, { helpful: true });
      } else {
        await unmarkReviewHelpful(reviewId);
      }
    } catch (cause: unknown) {
      setViewerMarkedHelpful(previousMarkedRef.current);
      await revalidateReviewListPages(quizId);
      setLastError(
        isApiError(cause)
          ? cause
          : ApiError.fromInput({
              status: 0,
              code: "GLOBAL_UNKNOWN",
              message: cause instanceof Error ? cause.message : String(cause),
            }),
      );
    } finally {
      setIsPending(false);
    }
  }, [quizId, reviewId, viewerMarkedHelpful]);

  const reset = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    toggle: handleToggle,
    isPending,
    viewerMarkedHelpful,
    lastError,
    reset,
  };
}
