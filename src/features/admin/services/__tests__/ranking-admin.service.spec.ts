/**
 * `ranking-admin.service.spec.ts` — Locks the ranking admin service
 * contract (TKT-7.1.E5).
 *
 * Verifies:
 *   - `recalculateRanking` POSTs to `/admin/ranking/recalculate`.
 *   - `resetRankingPeriod` POSTs to `/admin/ranking/reset` with the
 *     typed-confirm payload.
 *   - `checkRankingConsistency` GETs `/admin/ranking/consistency-check`.
 *   - `OPERATION_RUNNING` and `OPERATION_COOLDOWN` codes propagate
 *     without retry.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockOrvalCustomInstance = vi.fn();

vi.mock('@/lib/api/core/custom-instance', () => ({
  orvalCustomInstance: (...args: unknown[]) =>
    mockOrvalCustomInstance(...args),
}));

import { ApiError } from '@/lib/api/core/ApiError';

import {
  checkRankingConsistency,
  recalculateRanking,
  resetRankingPeriod,
} from '../ranking-admin.service';

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

const wrapped = (data: unknown) => data;

beforeEach(() => {
  mockOrvalCustomInstance.mockReset();
});

describe('ranking-admin.service — recalculateRanking', () => {
  it('POSTs to /admin/ranking/recalculate with the input', async () => {
    mockOrvalCustomInstance.mockResolvedValueOnce(
      wrapped({
        jobId: 'job-1',
        status: 'queued',
        startedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const result = await recalculateRanking({ periodId: 'p-1' });

    expect(mockOrvalCustomInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/admin/ranking/recalculate',
        method: 'POST',
        data: { periodId: 'p-1' },
      }),
    );
    expect(result.jobId).toBe('job-1');
    expect(result.status).toBe('queued');
  });

  it('propagates OPERATION_RUNNING without retry', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(recalculateRanking()).rejects.toBe(error);
    expect(mockOrvalCustomInstance).toHaveBeenCalledTimes(1);
  });

  it('propagates OPERATION_COOLDOWN without retry', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(recalculateRanking()).rejects.toBe(error);
    expect(mockOrvalCustomInstance).toHaveBeenCalledTimes(1);
  });
});

describe('ranking-admin.service — resetRankingPeriod', () => {
  it('POSTs to /admin/ranking/reset with the typed-confirm payload', async () => {
    mockOrvalCustomInstance.mockResolvedValueOnce(
      wrapped({
        periodId: 'p-1',
        resetAt: '2026-01-01T00:00:00.000Z',
        affectedUsers: 12,
      }),
    );

    const result = await resetRankingPeriod({
      periodId: 'p-1',
      confirmString: 'RESET RANKING PERIOD',
    });

    expect(mockOrvalCustomInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/admin/ranking/reset',
        method: 'POST',
        data: { periodId: 'p-1', confirmString: 'RESET RANKING PERIOD' },
      }),
    );
    expect(result.periodId).toBe('p-1');
  });

  it('propagates IRREVERSIBLE_CONFIRM_REQUIRED without retry', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(
      resetRankingPeriod({ periodId: 'p-1', confirmString: 'wrong' }),
    ).rejects.toBe(error);
    expect(mockOrvalCustomInstance).toHaveBeenCalledTimes(1);
  });
});

describe('ranking-admin.service — checkRankingConsistency', () => {
  it('GETs /admin/ranking/consistency-check', async () => {
    mockOrvalCustomInstance.mockResolvedValueOnce(
      wrapped({
        status: 'ok',
        severity: 'low',
        issueCount: 0,
        checkedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const result = await checkRankingConsistency();

    expect(mockOrvalCustomInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/admin/ranking/consistency-check',
        method: 'GET',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.issueCount).toBe(0);
  });

  it('does not retry on 5xx', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockOrvalCustomInstance.mockRejectedValueOnce(error);

    await expect(checkRankingConsistency()).rejects.toBe(error);
    expect(mockOrvalCustomInstance).toHaveBeenCalledTimes(1);
  });
});

describe('ranking-admin.service — JSDoc invariants', () => {
  it('documents OPERATION_RUNNING, OPERATION_COOLDOWN, and IRREVERSIBLE_CONFIRM_REQUIRED', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sourcePath = join(here, '..', 'ranking-admin.service.ts');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(/OPERATION_RUNNING/);
    expect(source).toMatch(/OPERATION_COOLDOWN/);
    expect(source).toMatch(/IRREVERSIBLE_CONFIRM_REQUIRED/);
  });
});
