

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { usePublishVersion } from '@/features/quizzes/hooks/usePublishVersion';

const mockPublishQuizVersion = vi.fn();
vi.mock('@/features/quizzes/services/quizzes.service', () => ({
publishQuizVersion: (...args: unknown[]) => mockPublishQuizVersion(...args),
}));

vi.mock('swr', () => ({
useSWRConfig: vi.fn(() => ({
mutate: vi.fn(),
  })),
}));

function makeVersionSummary(versionId: string, status: 'draft' | 'published' = 'published') {
return {
quizVersionId: versionId,
quizId: 'quiz-123',
versionNumber: 1,
status,
difficulty: 'medium' as const,
durationMs: 300_000,
passingScorePercent: 70,
rewardXp: 100,
questions: undefined,
publishedAt: status === 'published' ? '2026-01-01T00:00:00.000Z' : undefined,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeApiError(
status: number,
code: string,
message: string = `Error ${status}`,
): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message,
code: undefined,
config: undefined,
response: {
status,
statusText: message,
data: {
type: 'about:blank',
title: message,
status,
detail: message,
extensions: {
code,
requestId: 'req-test',
        },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('usePublishVersion service contract', () => {
const quizId = 'quiz-123';
const versionId = 'version-123';

it('publishes version successfully', async () => {
const mockVersion = makeVersionSummary(versionId, 'published');
mockPublishQuizVersion.mockResolvedValueOnce({
data: mockVersion,
    });

const response = await mockPublishQuizVersion(quizId, versionId);
const version = (response as { data?: typeof mockVersion }).data;

expect(version).toEqual(mockVersion);
expect(version?.status).toBe('published');
  });

it('surfaces QUIZ_INSUFFICIENT_QUESTIONS error (409)', async () => {
const error = makeApiError(409, 'QUIZ_INSUFFICIENT_QUESTIONS', 'Not enough questions');
mockPublishQuizVersion.mockRejectedValueOnce(error);

let caughtError: ApiError | undefined;
try {
await mockPublishQuizVersion(quizId, versionId);
    } catch (e) {
caughtError = e as ApiError;
    }

expect(caughtError?.code).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
expect(caughtError?.status).toBe(409);
  });

it('surfaces QUIZ_VERSION_IMMUTABLE error (409)', async () => {
const error = makeApiError(409, 'QUIZ_VERSION_IMMUTABLE', 'Version already published');
mockPublishQuizVersion.mockRejectedValueOnce(error);

let caughtError: ApiError | undefined;
try {
await mockPublishQuizVersion(quizId, versionId);
    } catch (e) {
caughtError = e as ApiError;
    }

expect(caughtError?.code).toBe('QUIZ_VERSION_IMMUTABLE');
expect(caughtError?.status).toBe(409);
  });

it('surfaces GLOBAL_RATE_LIMITED error (429)', async () => {
const error = makeApiError(429, 'GLOBAL_RATE_LIMITED', 'Too many requests');
mockPublishQuizVersion.mockRejectedValueOnce(error);

let caughtError: ApiError | undefined;
try {
await mockPublishQuizVersion(quizId, versionId);
    } catch (e) {
caughtError = e as ApiError;
    }

expect(caughtError?.code).toBe('GLOBAL_RATE_LIMITED');
expect(caughtError?.status).toBe(429);
  });

it('surfaces 5xx server error', async () => {
const error = makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'Internal server error');
mockPublishQuizVersion.mockRejectedValueOnce(error);

let caughtError: ApiError | undefined;
try {
await mockPublishQuizVersion(quizId, versionId);
    } catch (e) {
caughtError = e as ApiError;
    }

expect(caughtError?.status).toBe(500);
expect(caughtError?.code).toBe('GLOBAL_INTERNAL_ERROR');
  });

it('surfaces 502 bad gateway error', async () => {
const error = makeApiError(502, 'GLOBAL_INTERNAL_ERROR', 'Bad gateway');
mockPublishQuizVersion.mockRejectedValueOnce(error);

let caughtError: ApiError | undefined;
try {
await mockPublishQuizVersion(quizId, versionId);
    } catch (e) {
caughtError = e as ApiError;
    }

expect(caughtError?.status).toBe(502);
  });

it('surfaces 503 service unavailable error', async () => {
const error = makeApiError(503, 'GLOBAL_INTERNAL_ERROR', 'Service unavailable');
mockPublishQuizVersion.mockRejectedValueOnce(error);

let caughtError: ApiError | undefined;
try {
await mockPublishQuizVersion(quizId, versionId);
    } catch (e) {
caughtError = e as ApiError;
    }

expect(caughtError?.status).toBe(503);
expect(caughtError?.code).toBe('GLOBAL_INTERNAL_ERROR');
  });

it('throws on unexpected response shape (no data field)', async () => {
mockPublishQuizVersion.mockResolvedValueOnce({});

let caughtError: unknown;
try {
const response = await mockPublishQuizVersion(quizId, versionId);
const version = (response as { data?: typeof mockVersion }).data;
if (!version) {
throw new Error('Unexpected response shape');
      }
    } catch (e) {
caughtError = e;
    }

expect(caughtError).toBeInstanceOf(Error);
expect((caughtError as Error).message).toContain('Unexpected response shape');
  });

it('returns version with publishedAt after success', async () => {
const mockVersion = makeVersionSummary(versionId, 'published');
mockPublishQuizVersion.mockResolvedValueOnce({
data: mockVersion,
    });

const response = await mockPublishQuizVersion(quizId, versionId);
const version = (response as { data?: typeof mockVersion }).data;

expect(version?.status).toBe('published');
expect(version?.publishedAt).toBeDefined();
expect(version?.publishedAt).toBe('2026-01-01T00:00:00.000Z');
  });

it('calls service with correct arguments', async () => {
const mockVersion = makeVersionSummary(versionId, 'published');
mockPublishQuizVersion.mockResolvedValueOnce({
data: mockVersion,
    });

await mockPublishQuizVersion(quizId, versionId);

expect(mockPublishQuizVersion).toHaveBeenCalledTimes(1);
expect(mockPublishQuizVersion).toHaveBeenCalledWith(quizId, versionId);
  });
});
