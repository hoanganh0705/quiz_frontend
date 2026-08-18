

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { isApiError, ApiError } from '@/lib/api';

import {
markReviewHelpful,
unmarkReviewHelpful,
} from '@/features/reviews/services/reviews.service';
import type { ReviewDto } from '@/features/reviews/types';

import type { CursorPage } from '@/lib/api/use-cursor-paginated.types';

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

function isReviewListPageForQuiz(
key: readonly unknown[],
quizId: string,
): boolean {
if (!Array.isArray(key)) return false;
if (key[0] !== 'reviews' || key[1] !== 'quiz') return false;
return key[2] === quizId;
}

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
await globalMutate(
(key: readonly unknown[]) => isReviewListPageForQuiz(key, quizId),
(current: unknown): unknown => {
if (!current) return current;
const page = current as CursorPage<ReviewDto> | undefined;
if (!page || !Array.isArray(page.items)) return current;
return applyCountDeltaToPage(page, reviewId, delta);
    },
{ revalidate: false, populateCache: true },
  );
}

async function revalidateReviewListPages(quizId: string): Promise<void> {
await globalMutate(
(key: readonly unknown[]) => isReviewListPageForQuiz(key, quizId),
undefined,
{ revalidate: true },
  );
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
typeof performance !== 'undefined' ? performance.now() : Date.now();
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
if (isApiError(cause)) {
setLastError(cause);
      } else {
setLastError(
makeSyntheticApiError(0, 'GLOBAL_UNKNOWN', String(cause)),
        );
      }
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

function makeSyntheticApiError(
status: number,
code: string,
message: string,
): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message,
code,
config: undefined,
request: undefined,
response: {
status,
statusText: message,
data: {
type: 'https://api.quiz.local/problems/synthetic',
title: message,
status,
detail: message,
extensions: { code, requestId: 'req-synthetic' },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}
