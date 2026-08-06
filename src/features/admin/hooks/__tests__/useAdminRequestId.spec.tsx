/**
 * `features/admin/hooks/__tests__/useAdminRequestId.spec.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.D2.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/core/ApiError';

import { useAdminRequestId, useAdminRequestIdStore } from '../useAdminRequestId';

function makeApiError(extensions: {
  requestId?: string;
  correlationId?: string;
}): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: 'mock',
    config: undefined,
    request: undefined,
    response: {
      status: 500,
      data: {
        status: 500,
        detail: 'boom',
        title: 'Internal Server Error',
        extensions,
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('useAdminRequestId', () => {
  afterEach(() => {
    // Reset the store between tests so cross-test entries never leak.
    useAdminRequestIdStore.setState({ entries: {} });
  });

  it('setFromError populates requestId and correlationId for the given mutationId', () => {
    const { result } = renderHook(() => useAdminRequestId('ranking-recalculate'));
    const error = makeApiError({
      requestId: 'req-1',
      correlationId: 'corr-1',
    });

    act(() => {
      result.current.setFromError(error);
    });

    expect(result.current.requestId).toBe('req-1');
    expect(result.current.correlationId).toBe('corr-1');
    expect(result.current.error).toBe(error);
  });

  it('two mutations with different ids do not clobber each other', () => {
    const a = renderHook(() => useAdminRequestId('mutation-a'));
    const b = renderHook(() => useAdminRequestId('mutation-b'));

    const errorA = makeApiError({
      requestId: 'req-a',
      correlationId: 'corr-a',
    });
    const errorB = makeApiError({
      requestId: 'req-b',
      correlationId: 'corr-b',
    });

    act(() => {
      a.result.current.setFromError(errorA);
    });
    act(() => {
      b.result.current.setFromError(errorB);
    });

    expect(a.result.current.requestId).toBe('req-a');
    expect(a.result.current.correlationId).toBe('corr-a');
    expect(b.result.current.requestId).toBe('req-b');
    expect(b.result.current.correlationId).toBe('corr-b');
  });

  it('setFromError(null) clears the entry for the given mutationId', () => {
    const { result } = renderHook(() => useAdminRequestId('ranking-recalculate'));
    const error = makeApiError({ requestId: 'req-1' });

    act(() => {
      result.current.setFromError(error);
    });
    expect(result.current.requestId).toBe('req-1');

    act(() => {
      result.current.setFromError(null);
    });
    expect(result.current.requestId).toBeNull();
    expect(result.current.correlationId).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
