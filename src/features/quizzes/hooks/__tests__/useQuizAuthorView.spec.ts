/**
 * `useQuizAuthorView.spec.ts` — unit tests for the quiz author view hook.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.21.
 *
 * Tests the useQuizAuthorView hook for:
 * - Success path (returns quiz data)
 * - 404 quiz not found
 * - 403 forbidden (non-owner)
 * - 429 rate limit
 * - 5xx server error
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useQuizAuthorView } from '@/features/quizzes/hooks/useQuizAuthorView';

// Mock the service module
const mockGetQuizByIdOrSlug = vi.fn();
vi.mock('@/features/quizzes/services/quizzes.service', () => ({
  getQuizByIdOrSlug: (...args: unknown[]) => mockGetQuizByIdOrSlug(...args),
}));

function makeQuizResponse(quizId: string) {
  return {
    quizId,
    title: `Test Quiz ${quizId}`,
    description: 'A test quiz description',
    slug: `test-quiz-${quizId}`,
    creatorId: 'creator-123',
    imageUrl: null,
    categoryId: 'cat-123',
    isHidden: false,
    publishedVersionId: 'version-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

function makeApiError(
  status: number,
  code: string = `TEST_ERROR_${status}`,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status,
      data: {
        type: 'about:blank',
        title: `Error ${status}`,
        status,
        code,
      },
    },
    config: undefined,
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
  mockGetQuizByIdOrSlug.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useQuizAuthorView', () => {
  const quizId = 'quiz-123';

  it('returns quiz data on success', async () => {
    const mockResponse = makeQuizResponse(quizId);
    mockGetQuizByIdOrSlug.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useQuizAuthorView(quizId));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  it('returns notFound=true on 404', async () => {
    const error = makeApiError(404, 'QUIZ_NOT_FOUND');
    mockGetQuizByIdOrSlug.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useQuizAuthorView(quizId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notFound).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('returns error on 403 QUIZ_FORBIDDEN', async () => {
    const error = makeApiError(403, 'QUIZ_FORBIDDEN');
    mockGetQuizByIdOrSlug.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useQuizAuthorView(quizId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.status).toBe(403);
    expect(result.current.error?.code).toBe('QUIZ_FORBIDDEN');
  });

  it('returns error on 429 rate limit', async () => {
    const error = makeApiError(429, 'GLOBAL_RATE_LIMITED');
    mockGetQuizByIdOrSlug.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useQuizAuthorView(quizId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.status).toBe(429);
    expect(result.current.error?.code).toBe('GLOBAL_RATE_LIMITED');
  });

  it('returns error on 5xx server error', async () => {
    const error = makeApiError(500, 'GLOBAL_INTERNAL_ERROR');
    mockGetQuizByIdOrSlug.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useQuizAuthorView(quizId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.status).toBe(500);
  });

  it('does not fetch when quizId is null', () => {
    const { result } = renderHook(() => useQuizAuthorView(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(mockGetQuizByIdOrSlug).not.toHaveBeenCalled();
  });

  it('returns retry function', async () => {
    const mockResponse = makeQuizResponse(quizId);
    mockGetQuizByIdOrSlug.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useQuizAuthorView(quizId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.retry).toBe('function');
  });
});
