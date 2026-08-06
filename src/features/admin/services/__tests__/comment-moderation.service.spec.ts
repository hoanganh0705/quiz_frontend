/**
 * `comment-moderation.service.spec.ts` — Locks the comment moderation
 * service contract (TKT-7.1.E4).
 *
 * Verifies:
 *   - `listCommentReports` calls `listReports` and normalises the
 *     paginated response.
 *   - `patchCommentReport` calls `reviewReport` with the report id
 *     and action.
 *   - `hideComment` decodes `COMMENT_ALREADY_HIDDEN`; `restoreComment`
 *     decodes `COMMENT_NOT_HIDDEN`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCommentsSdk = {
  listReports: vi.fn(),
  reviewReport: vi.fn(),
  hideComment: vi.fn(),
  restoreComment: vi.fn(),
};

vi.mock('@/lib/api', () => ({
  getComments: () => mockCommentsSdk,
}));

vi.mock('@/lib/api/generated/comments/comments', () => ({}));

import { ApiError } from '@/lib/api/core/ApiError';

import {
  hideComment,
  listCommentReports,
  patchCommentReport,
  restoreComment,
} from '../comment-moderation.service';

const REPORT_FIXTURE = {
  reportId: 'report-1',
  commentId: 'comment-1',
  reason: 'spam',
  status: 'pending',
};

const wrapped = (data: unknown, pagination?: { hasNextPage: boolean; nextCursor: string | null }) => ({
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
  Object.values(mockCommentsSdk).forEach((fn) => fn.mockReset());
});

describe('comment-moderation.service — listCommentReports', () => {
  it('calls listReports and unwraps the paginated response', async () => {
    mockCommentsSdk.listReports.mockResolvedValueOnce(
      wrapped([REPORT_FIXTURE], { hasNextPage: true, nextCursor: 'cursor-2' }),
    );

    const result = await listCommentReports({ cursor: 'cursor-1', limit: 10 });

    expect(mockCommentsSdk.listReports).toHaveBeenCalledWith({
      cursor: 'cursor-1',
      limit: 10,
    });
    expect(result.items).toEqual([REPORT_FIXTURE]);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBe('cursor-2');
  });

  it('returns an empty page when the payload carries no items', async () => {
    mockCommentsSdk.listReports.mockResolvedValueOnce(
      wrapped([], { hasNextPage: false, nextCursor: null }),
    );

    const result = await listCommentReports();

    expect(result.items).toEqual([]);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('propagates ApiError on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCommentsSdk.listReports.mockRejectedValueOnce(error);

    await expect(listCommentReports()).rejects.toBe(error);
  });
});

describe('comment-moderation.service — patchCommentReport', () => {
  it('calls reviewReport with id and action', async () => {
    mockCommentsSdk.reviewReport.mockResolvedValueOnce(
      wrapped({ ...REPORT_FIXTURE, status: 'reviewed' }),
    );

    const result = await patchCommentReport('report-1', { status: 'reviewed' });

    expect(mockCommentsSdk.reviewReport).toHaveBeenCalledWith('report-1', {
      status: 'reviewed',
    });
    expect(result.status).toBe('reviewed');
  });

  it('propagates ApiError on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCommentsSdk.reviewReport.mockRejectedValueOnce(error);

    await expect(
      patchCommentReport('report-1', { status: 'reviewed' }),
    ).rejects.toBe(error);
  });
});

describe('comment-moderation.service — hideComment', () => {
  it('calls hideComment with the comment id', async () => {
    mockCommentsSdk.hideComment.mockResolvedValueOnce(wrapped({ commentId: 'c-1' }));

    const result = await hideComment('c-1', { reason: 'spam' });

    expect(mockCommentsSdk.hideComment).toHaveBeenCalledWith('c-1');
    expect(result).toEqual({ commentId: 'c-1' });
  });

  it('propagates ApiError with COMMENT_ALREADY_HIDDEN on already-hidden', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCommentsSdk.hideComment.mockRejectedValueOnce(error);

    await expect(hideComment('c-1', { reason: 'spam' })).rejects.toBe(error);
  });
});

describe('comment-moderation.service — restoreComment', () => {
  it('calls restoreComment with the comment id', async () => {
    mockCommentsSdk.restoreComment.mockResolvedValueOnce(wrapped({ commentId: 'c-1' }));

    const result = await restoreComment('c-1', { reason: 'mistake' });

    expect(mockCommentsSdk.restoreComment).toHaveBeenCalledWith('c-1');
    expect(result).toEqual({ commentId: 'c-1' });
  });

  it('propagates ApiError with COMMENT_NOT_HIDDEN on not-hidden', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCommentsSdk.restoreComment.mockRejectedValueOnce(error);

    await expect(restoreComment('c-1', { reason: 'mistake' })).rejects.toBe(error);
  });
});

describe('comment-moderation.service — JSDoc invariants', () => {
  it('hideComment documents COMMENT_ALREADY_HIDDEN', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sourcePath = join(here, '..', 'comment-moderation.service.ts');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(/hideComment[\s\S]{0,1000}COMMENT_ALREADY_HIDDEN/);
  });

  it('restoreComment documents COMMENT_NOT_HIDDEN', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sourcePath = join(here, '..', 'comment-moderation.service.ts');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(/restoreComment[\s\S]{0,1000}COMMENT_NOT_HIDDEN/);
  });
});
