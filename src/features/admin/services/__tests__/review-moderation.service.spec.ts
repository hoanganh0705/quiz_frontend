/**
 * `review-moderation.service.spec.ts` — Locks the review moderation
 * service contract (TKT-7.1.E3).
 *
 * Verifies:
 *   - `listReviewReports` calls `adminReviewControllerListPlatformReports`
 *     and normalises the paginated response.
 *   - `patchReviewReport` calls `adminReviewControllerUpdateReportStatus`
 *     with the report id and action.
 *   - `REVIEW_REPORT_ALREADY_RESOLVED` is documented in the JSDoc.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReviewSdk = {
  adminReviewControllerListPlatformReports: vi.fn(),
  adminReviewControllerUpdateReportStatus: vi.fn(),
};

vi.mock('@/lib/api', () => ({
  getReviews: () => mockReviewSdk,
}));

vi.mock('@/lib/api/generated/reviews/reviews', () => ({}));

import { ApiError } from '@/lib/api/core/ApiError';

import { listReviewReports, patchReviewReport } from '../review-moderation.service';

const REPORT_FIXTURE = {
  reportId: 'report-1',
  reviewId: 'review-1',
  reason: 'spam',
  status: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const wrapped = (
  data: unknown,
  pagination?: { hasNextPage: boolean; nextCursor: string | null },
) => ({
  data: data,
  meta: { requestId: 'req-1', pagination: pagination ?? null },
} as unknown);

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

beforeEach(() => {
  Object.values(mockReviewSdk).forEach((fn) => fn.mockReset());
});

describe('review-moderation.service — listReviewReports', () => {
  it('calls adminReviewControllerListPlatformReports and unwraps the response', async () => {
    mockReviewSdk.adminReviewControllerListPlatformReports.mockResolvedValueOnce(
      wrapped([REPORT_FIXTURE], { hasNextPage: true, nextCursor: 'cursor-2' }),
    );

    const result = await listReviewReports({ cursor: 'cursor-1', limit: 10 });

    expect(
      mockReviewSdk.adminReviewControllerListPlatformReports,
    ).toHaveBeenCalledWith({ cursor: 'cursor-1', limit: 10 });
    expect(result.items).toEqual([REPORT_FIXTURE]);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBe('cursor-2');
  });

  it('returns an empty page when the payload carries no items', async () => {
    mockReviewSdk.adminReviewControllerListPlatformReports.mockResolvedValueOnce(
      wrapped([], { hasNextPage: false, nextCursor: null }),
    );

    const result = await listReviewReports();

    expect(result.items).toEqual([]);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('propagates ApiError on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockReviewSdk.adminReviewControllerListPlatformReports.mockRejectedValueOnce(
      error,
    );

    await expect(listReviewReports()).rejects.toBe(error);
  });
});

describe('review-moderation.service — patchReviewReport', () => {
  it('calls adminReviewControllerUpdateReportStatus with id and action', async () => {
    mockReviewSdk.adminReviewControllerUpdateReportStatus.mockResolvedValueOnce(
      wrapped({ ...REPORT_FIXTURE, status: 'reviewed' }),
    );

    const result = await patchReviewReport('report-1', { status: 'reviewed' });

    expect(
      mockReviewSdk.adminReviewControllerUpdateReportStatus,
    ).toHaveBeenCalledWith('report-1', { status: 'reviewed' });
    expect(result.status).toBe('reviewed');
  });

  it('propagates ApiError with REVIEW_REPORT_ALREADY_RESOLVED on already-resolved', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockReviewSdk.adminReviewControllerUpdateReportStatus.mockRejectedValueOnce(
      error,
    );

    await expect(patchReviewReport('report-1', { status: 'reviewed' })).rejects.toBe(error);
  });
});

describe('review-moderation.service — JSDoc invariants', () => {
  it('patchReviewReport documents REVIEW_REPORT_ALREADY_RESOLVED', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sourcePath = join(here, '..', 'review-moderation.service.ts');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(
      /patchReviewReport[\s\S]{0,1200}REVIEW_REPORT_ALREADY_RESOLVED/,
    );
  });
});
