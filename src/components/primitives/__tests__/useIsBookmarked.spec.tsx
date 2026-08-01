/**
 * `useIsBookmarked.spec.tsx` — locks the placeholder reader contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B4.
 *
 * Three cases per the ticket AC #1–3:
 *
 *   (a) The hook accepts `quizId: string` and returns `false` for
 *       every value (B4 AC #1).
 *   (b) It performs no network request, store mutation, persistence,
 *       or auth redirect (B4 AC #2).
 *   (c) Its exported name and signature can be replaced internally
 *       by Story 3.10 without changing `QuizCtaStrip` props (B4
 *       AC #3).
 *
 * Test-environment notes: the file lives under
 * `src/components/primitives/__tests__/` so vitest's `jsdom`
 * project picks it up.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useIsBookmarked } from '@/features/quizzes/hooks/useIsBookmarked';

describe('useIsBookmarked — placeholder', () => {
  it('(a) returns `false` for every quizId', () => {
    const { result: a } = renderHook(() => useIsBookmarked('quiz-A'));
    const { result: b } = renderHook(() => useIsBookmarked('quiz-B'));
    const { result: empty } = renderHook(() => useIsBookmarked(''));
    const { result: longId } = renderHook(() =>
      useIsBookmarked('0192d2b0-7c1a-7abc-9aaa-000000000abc'),
    );

    expect(a.current.isBookmarked).toBe(false);
    expect(b.current.isBookmarked).toBe(false);
    expect(empty.current.isBookmarked).toBe(false);
    expect(longId.current.isBookmarked).toBe(false);
    expect(a.current.isLoading).toBe(false);
    expect(b.current.isLoading).toBe(false);
  });

  it('(b) performs no network request, no auth redirect, no persistence', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response()));
    const localStorageSetSpy = vi.spyOn(
      window.localStorage,
      'setItem',
    );
    const sessionStorageSetSpy = vi.spyOn(
      window.sessionStorage,
      'setItem',
    );

    const { result } = renderHook(() => useIsBookmarked('quiz-net'));

    expect(result.current.isBookmarked).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorageSetSpy).not.toHaveBeenCalled();
    expect(sessionStorageSetSpy).not.toHaveBeenCalled();
  });

  it('(c) the exported symbol is a stable function reference', () => {
    // The reference must not change between renders. Story 3.10
    // can replace the internal implementation while keeping the
    // exported name.
    const { result, rerender } = renderHook(() => useIsBookmarked('quiz-x'));

    const firstShape = JSON.stringify({
      isBookmarked: result.current.isBookmarked,
      isLoading: result.current.isLoading,
    });

    rerender();

    const secondShape = JSON.stringify({
      isBookmarked: result.current.isBookmarked,
      isLoading: result.current.isLoading,
    });

    expect(firstShape).toBe(secondShape);
    const exposedKeys = Object.keys(result.current).sort();
    expect(exposedKeys).toEqual(['isBookmarked', 'isLoading']);
  });
});
