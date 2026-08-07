/**
 * `useAsyncJobStatus` unit tests.
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C6.
 *
 * Coverage map (TKT-7.8.C6 acceptance criteria):
 *
 *   AC #1 — null jobId → { status: 'idle', isPolling: false }.
 *   AC #6 — stub returns { status: 'idle', isPolling: false } regardless of input
 *            (backend does not expose jobId at this commit — confirmed by A1 §2.4).
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAsyncJobStatus } from '../useAsyncJobStatus';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useAsyncJobStatus (noop stub)', () => {
  it('AC #1 — null jobId returns idle, not polling', () => {
    const { result } = renderHook(() => useAsyncJobStatus(null));

    expect(result.current.status).toBe('idle');
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('AC #6 — any jobId value returns idle (stub behaviour)', () => {
    const { result } = renderHook(() =>
      useAsyncJobStatus('00000000-0000-4000-8000-000000000001'),
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('returns consistent values across re-renders (no infinite loops)', () => {
    const { result, rerender } = renderHook(() =>
      useAsyncJobStatus(null),
    );

    const initial = result.current;

    rerender();
    expect(result.current).toBe(initial);

    rerender();
    expect(result.current).toBe(initial);
  });
});
