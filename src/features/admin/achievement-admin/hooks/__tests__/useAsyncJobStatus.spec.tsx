

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAsyncJobStatus } from '../useAsyncJobStatus';

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
