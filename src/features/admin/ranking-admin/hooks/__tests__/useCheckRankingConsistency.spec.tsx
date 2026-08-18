

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useCheckRankingConsistency } from '../useCheckRankingConsistency';

const mockCheckRankingConsistency = vi.hoisted(() => vi.fn());
const mockAddRankingAdminBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/ranking-admin.service', () => ({
checkRankingConsistency: (...args: unknown[]) =>
mockCheckRankingConsistency(...args),
}));

vi.mock('@/lib/admin/admin_live_sentry', async () => {
const actual =
await vi.importActual<typeof import('@/lib/admin/admin_live_sentry')>(
'@/lib/admin/admin_live_sentry',
    );
return {
...actual,
addRankingAdminBreadcrumb: (...args: unknown[]) =>
mockAddRankingAdminBreadcrumb(...args),
  };
});

const EMPTY_RESPONSE_FIXTURE = {
jobId: 'job-consistency-1',
status: 'completed' as const,
checkedAt: '2025-08-07T00:00:00.000Z',
issueCount: 0,
};

const PARTIAL_RESPONSE_FIXTURE = {
jobId: 'job-consistency-2',
status: 'completed' as const,
checkedAt: '2025-08-07T00:00:00.000Z',
issueCount: 5,
};

function makeApiError(
code: string,
requestId = 'req-1',
correlationId = 'corr-1',
extensions: Record<string, unknown> = {},
): ApiError {

const error = {
isAxiosError: true,
response: {
status: code === 'PERMISSION_DENIED' ? 403 : 409,
statusText: '',
headers: {},
config: { headers: {} },
data: {
status: code === 'PERMISSION_DENIED' ? 403 : 409,
detail: code,
title: code,
extensions: { code, requestId, correlationId, ...extensions },
      },
    },
name: 'AxiosError',
message: code,
  };
return new ApiError(error as unknown as ConstructorParameters<typeof ApiError>[0]);
}

beforeEach(() => {
mockCheckRankingConsistency.mockReset();
mockAddRankingAdminBreadcrumb.mockReset();
});

afterEach(() => {
vi.restoreAllMocks();
});

function renderHookUnderTest() {
return renderHook(() => useCheckRankingConsistency());
}

describe('TKT-7.9.C3 — useCheckRankingConsistency', () => {
it('initial state is empty', () => {
const { result } = renderHookUnderTest();
expect(result.current.inconsistencies).toEqual([]);
expect(result.current.totalCount).toBe(null);
expect(result.current.checkedAt).toBe(null);
expect(result.current.error).toBe(null);
expect(result.current.isRunning).toBe(false);
expect(result.current.isPartialResult).toBe(false);
  });

it('AC #1 — calls service when triggered', async () => {
mockCheckRankingConsistency.mockResolvedValueOnce(EMPTY_RESPONSE_FIXTURE);
const { result } = renderHookUnderTest();

await act(async () => {
await result.current.trigger();
    });

await waitFor(() => {
expect(mockCheckRankingConsistency).toHaveBeenCalledTimes(1);
    });
  });

it('AC #2 — empty state when zero inconsistencies', async () => {
mockCheckRankingConsistency.mockResolvedValueOnce(EMPTY_RESPONSE_FIXTURE);
const { result } = renderHookUnderTest();

await act(async () => {
await result.current.trigger();
    });

await waitFor(() => {
expect(result.current.checkedAt).not.toBe(null);
    });
expect(result.current.inconsistencies).toEqual([]);
expect(result.current.totalCount).toBe(0);
expect(result.current.isPartialResult).toBe(false);
  });

it('AC #3 — partial result flag set when issues exist but no per-item list', async () => {
mockCheckRankingConsistency.mockResolvedValueOnce(PARTIAL_RESPONSE_FIXTURE);
const { result } = renderHookUnderTest();

await act(async () => {
await result.current.trigger();
    });

await waitFor(() => {
expect(result.current.checkedAt).not.toBe(null);
    });
expect(result.current.totalCount).toBe(5);
expect(result.current.isPartialResult).toBe(true);
  });

it('AC #4 — OPERATION_RUNNING sets error; isRunning false', async () => {
mockCheckRankingConsistency.mockRejectedValueOnce(makeApiError('OPERATION_RUNNING'));
const { result } = renderHookUnderTest();

await act(async () => {
await expect(result.current.trigger()).rejects.toMatchObject({
code: 'OPERATION_RUNNING',
      });
    });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });
expect(result.current.error!.code).toBe('OPERATION_RUNNING');
expect(result.current.isRunning).toBe(false);
  });

it('AC #5 — success breadcrumb emitted', async () => {
mockCheckRankingConsistency.mockResolvedValueOnce(EMPTY_RESPONSE_FIXTURE);
const { result } = renderHookUnderTest();

await act(async () => {
await result.current.trigger();
    });

await waitFor(() => {
expect(mockAddRankingAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({
action: 'ranking.consistencyCheck',
status: 'success',
        }),
      );
    });
  });

it('failure breadcrumb emitted on rejection', async () => {
mockCheckRankingConsistency.mockRejectedValueOnce(
makeApiError('PERMISSION_DENIED', 'req-failure', 'corr-failure'),
    );
const { result } = renderHookUnderTest();

await act(async () => {
await result.current.trigger().catch(() => {/* expected */});
    });

await waitFor(() => {
expect(mockAddRankingAdminBreadcrumb).toHaveBeenCalledTimes(2);
    });

const calls = mockAddRankingAdminBreadcrumb.mock.calls;
const failureCall = calls.find((call) => call[0]?.status === 'failure');
expect(failureCall).toBeDefined();
if (failureCall) {
expect(failureCall[0].action).toBe('ranking.consistencyCheck');
expect(failureCall[0].status).toBe('failure');
expect(failureCall[0].requestId).toBe('req-failure');
expect(failureCall[0].correlationId).toBe('corr-failure');
    }
  });

it('concurrent calls while in flight do not trigger duplicate service calls', async () => {
let resolveOuter: ((value: unknown) => void) | null = null;
mockCheckRankingConsistency.mockImplementationOnce(
() =>
new Promise((resolve) => {
resolveOuter = resolve;
        }),
    );

const { result } = renderHookUnderTest();

act(() => {
void result.current.trigger().catch(() => {/* expected */});
    });

expect(mockCheckRankingConsistency).toHaveBeenCalledTimes(1);

act(() => {
void result.current.trigger().catch(() => {/* expected */});
    });

expect(mockCheckRankingConsistency).toHaveBeenCalledTimes(1);

if (resolveOuter) {
(resolveOuter as (value: unknown) => void)(EMPTY_RESPONSE_FIXTURE);
    }

await waitFor(() => {
expect(result.current.checkedAt).not.toBe(null);
    });
  });

it('reset clears state', async () => {
mockCheckRankingConsistency.mockResolvedValueOnce(PARTIAL_RESPONSE_FIXTURE);
const { result } = renderHookUnderTest();

await act(async () => {
await result.current.trigger();
    });

await waitFor(() => {
expect(result.current.checkedAt).not.toBe(null);
    });

act(() => {
result.current.reset();
    });

expect(result.current.checkedAt).toBe(null);
expect(result.current.totalCount).toBe(null);
expect(result.current.inconsistencies).toEqual([]);
expect(result.current.isPartialResult).toBe(false);
expect(result.current.error).toBe(null);
  });

it('AC #6 — never retries on 4xx / 5xx', async () => {
mockCheckRankingConsistency.mockRejectedValueOnce(makeApiError('PERMISSION_DENIED'));
const { result } = renderHookUnderTest();

await act(async () => {
await result.current.trigger().catch(() => {/* expected */});
    });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });
expect(mockCheckRankingConsistency).toHaveBeenCalledTimes(1);
  });
});
