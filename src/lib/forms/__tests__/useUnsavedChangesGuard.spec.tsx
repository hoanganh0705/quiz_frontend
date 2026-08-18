

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

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

expect(result.current.isGuarding).toBe(false);

act(() => {
vi.advanceTimersByTime(4999);
    });

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

act(() => {
vi.advanceTimersByTime(5001);
    });

act(() => {
rerender({ dirty: true });
    });

expect(result.current.isGuarding).toBe(true);

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