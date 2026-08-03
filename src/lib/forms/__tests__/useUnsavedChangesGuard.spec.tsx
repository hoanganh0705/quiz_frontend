/**
 * `useUnsavedChangesGuard` unit tests.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.C3.
 *
 * Coverage contract:
 *
 *   (1) When `isDirty === false`, the hook reports `isGuarding === false`
 *       and does NOT install `beforeunload` / `popstate` listeners.
 *   (2) When `isDirty === true` but the threshold window has NOT elapsed,
 *       the hook reports `isGuarding === false`.
 *   (3) When `isDirty === true` AND the threshold has elapsed,
 *       the hook reports `isGuarding === true` and a synthetic
 *       `popstate` event flips `pendingPopstate` to `true`.
 *   (4) After `confirmPendingPopstate` is called, `pendingPopstate`
 *       resets to `false`.
 *   (5) `cancelPendingPopstate` calls `router.push(<previous pathname>)`
 *       to revert the navigation.
 *   (6) When `isDirty` flips back to `false`, the listeners are
 *       uninstalled.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

// ─── Mock `next/navigation` ──────────────────────────────────────────────

const mockRouterPush = vi.fn();
const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockUsePathname(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  mockRouterPush.mockReset();
  mockUsePathname.mockReturnValue('/quizzes/new');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useUnsavedChangesGuard', () => {
  it('(1) does not install listeners when isDirty is false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const beforeUnloadAdd = addSpy.mock.calls.filter(
      (c) => c[0] === 'beforeunload'
    );
    const popStateAdd = addSpy.mock.calls.filter((c) => c[0] === 'popstate');

    const { result } = renderHook(() =>
      useUnsavedChangesGuard({ isDirty: false })
    );

    expect(result.current.isGuarding).toBe(false);
    expect(result.current.pendingPopstate).toBe(false);
    // No listeners registered for beforeunload / popstate.
    const beforeUnloadAfter = addSpy.mock.calls.filter(
      (c) => c[0] === 'beforeunload'
    );
    const popStateAfter = addSpy.mock.calls.filter((c) => c[0] === 'popstate');
    expect(beforeUnloadAfter.length).toBe(beforeUnloadAdd.length);
    expect(popStateAfter.length).toBe(popStateAdd.length);
  });

  it('(2) does not install listeners before the threshold elapses', () => {
    const { result, rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) =>
        useUnsavedChangesGuard({ isDirty: dirty, thresholdMs: 5000 }),
      { initialProps: { dirty: false } }
    );

    expect(result.current.isGuarding).toBe(false);

    act(() => {
      rerender({ dirty: true });
    });
    // Still under threshold (no time has elapsed).
    expect(result.current.isGuarding).toBe(false);

    // Advance to just under the threshold.
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    // Re-evaluate by re-rendering with the same dirty flag.
    act(() => {
      rerender({ dirty: true });
    });
    expect(result.current.isGuarding).toBe(false);
  });

  it('(3) installs listeners after the threshold elapses and intercepts popstate', () => {
    const { result, rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) =>
        useUnsavedChangesGuard({ isDirty: dirty, thresholdMs: 5000 }),
      { initialProps: { dirty: false } }
    );

    act(() => {
      rerender({ dirty: true });
    });

    // Advance past the threshold.
    act(() => {
      vi.advanceTimersByTime(5001);
    });

    // Re-render so the hook's effect re-evaluates the predicate.
    act(() => {
      rerender({ dirty: true });
    });

    expect(result.current.isGuarding).toBe(true);

    // Dispatch a synthetic popstate event.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.pendingPopstate).toBe(true);
    expect(result.current.pendingPathname).toBe('/quizzes/new');
  });

  it('(4) confirmPendingPopstate resets pendingPopstate to false', () => {
    const { result, rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) =>
        useUnsavedChangesGuard({ isDirty: dirty, thresholdMs: 1000 }),
      { initialProps: { dirty: false } }
    );

    act(() => {
      rerender({ dirty: true });
    });
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    act(() => {
      rerender({ dirty: true });
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.pendingPopstate).toBe(true);

    act(() => {
      result.current.confirmPendingPopstate();
    });
    expect(result.current.pendingPopstate).toBe(false);
    expect(result.current.pendingPathname).toBeNull();
  });

  it('(5) cancelPendingPopstate calls router.push with the last pathname', () => {
    const { result, rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) =>
        useUnsavedChangesGuard({ isDirty: dirty, thresholdMs: 1000 }),
      { initialProps: { dirty: false } }
    );

    act(() => {
      rerender({ dirty: true });
    });
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    act(() => {
      rerender({ dirty: true });
    });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.pendingPopstate).toBe(true);

    act(() => {
      result.current.cancelPendingPopstate();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/quizzes/new');
    expect(result.current.pendingPopstate).toBe(false);
  });

  it('(6) uninstalls listeners when isDirty flips back to false', () => {
    const { result, rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) =>
        useUnsavedChangesGuard({ isDirty: dirty, thresholdMs: 1000 }),
      { initialProps: { dirty: false } }
    );

    act(() => {
      rerender({ dirty: true });
    });
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    act(() => {
      rerender({ dirty: true });
    });
    expect(result.current.isGuarding).toBe(true);

    act(() => {
      rerender({ dirty: false });
    });
    expect(result.current.isGuarding).toBe(false);

    // Dispatch a popstate after the listener was uninstalled —
    // pendingPopstate should NOT flip.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.pendingPopstate).toBe(false);
  });

  it('exposes isGuarding === false when below the threshold window', () => {
    const { result, rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) =>
        useUnsavedChangesGuard({ isDirty: dirty, thresholdMs: 10000 }),
      { initialProps: { dirty: false } }
    );

    act(() => {
      rerender({ dirty: true });
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      rerender({ dirty: true });
    });
    expect(result.current.isGuarding).toBe(false);
  });
});