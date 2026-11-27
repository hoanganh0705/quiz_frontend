"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  parseQuizFilterUrl,
  serializeQuizFilterUrl,
  type QuizFilterUrlState,
} from "@/features/quizzes/types/quiz-filter-params";

export interface UseQuizFiltersUrlSyncResult {
  filters: QuizFilterUrlState;
  setFilters: (next: QuizFilterUrlState) => void;
  resetFilters: () => void;
}

export function useQuizFiltersUrlSync(
  initialState?: Partial<QuizFilterUrlState>,
): UseQuizFiltersUrlSyncResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchKey = searchParams.toString();

  const filters = useMemo<QuizFilterUrlState>(() => {
    const parsed = parseQuizFilterUrl(new URLSearchParams(searchKey));
    if (searchKey.length === 0 && initialState) {
      return { ...initialState };
    }
    return parsed;
  }, [searchKey, initialState]);

  const setFilters = useCallback(
    (next: QuizFilterUrlState) => {
      const params = serializeQuizFilterUrl(next);
      const queryString = params.toString();
      const target =
        queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
      router.replace(target);
    },
    [pathname, router],
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return { filters, setFilters, resetFilters };
}
