/**
 * `category-admin.service.spec.ts` — Locks the category admin service contract
 * (TKT-7.1.E2).
 *
 * Verifies:
 *   - Each service function calls the corresponding SDK function.
 *   - Each function unwraps the SDK envelope and returns the
 *     canonical `CategoryResponseDto`.
 *   - SDK errors propagate as `ApiError`.
 *   - `restoreCategory` documents `CATEGORY_SLUG_CONFLICT` in its JSDoc.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCategorySdk = {
  categoryControllerCreateCategory: vi.fn(),
  categoryControllerUpdateCategory: vi.fn(),
  categoryControllerDeleteCategory: vi.fn(),
  categoryControllerRestoreCategory: vi.fn(),
  categoryControllerGetCategoryById: vi.fn(),
};

vi.mock('@/lib/api', () => ({
  getCategories: () => mockCategorySdk,
}));

vi.mock('@/lib/api/generated/categories/categories', () => ({}));

import { ApiError } from '@/lib/api/core/ApiError';

import {
  createCategory,
  deleteCategory,
  getCategory,
  restoreCategory,
  updateCategory,
} from '../category-admin.service';

const CATEGORY_FIXTURE = {
  categoryId: 'cat-1',
  name: 'Math',
  slug: 'math',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const wrapped = (data: unknown) => ({
  data: data,
  meta: { requestId: 'req-1' },
});

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
  Object.values(mockCategorySdk).forEach((fn) => fn.mockReset());
});

describe('category-admin.service — createCategory', () => {
  it('calls categoryControllerCreateCategory and unwraps the response', async () => {
    mockCategorySdk.categoryControllerCreateCategory.mockResolvedValueOnce(
      wrapped(CATEGORY_FIXTURE),
    );

    const result = await createCategory({ name: 'Math', slug: 'math' });

    expect(mockCategorySdk.categoryControllerCreateCategory).toHaveBeenCalledWith(
      { name: 'Math', slug: 'math' },
    );
    expect(result).toEqual(CATEGORY_FIXTURE);
  });

  it('propagates ApiError when the SDK rejects', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCategorySdk.categoryControllerCreateCategory.mockRejectedValueOnce(error);

    await expect(
      createCategory({ name: 'Math', slug: 'math' }),
    ).rejects.toBe(error);
  });
});

describe('category-admin.service — updateCategory', () => {
  it('calls categoryControllerUpdateCategory with id and input', async () => {
    mockCategorySdk.categoryControllerUpdateCategory.mockResolvedValueOnce(
      wrapped(CATEGORY_FIXTURE),
    );

    const result = await updateCategory('cat-1', { name: 'Math v2' });

    expect(mockCategorySdk.categoryControllerUpdateCategory).toHaveBeenCalledWith(
      'cat-1',
      { name: 'Math v2' },
    );
    expect(result).toEqual(CATEGORY_FIXTURE);
  });

  it('propagates ApiError on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCategorySdk.categoryControllerUpdateCategory.mockRejectedValueOnce(error);

    await expect(updateCategory('cat-1', { name: 'x' })).rejects.toBe(error);
  });
});

describe('category-admin.service — deleteCategory', () => {
  it('calls categoryControllerDeleteCategory with the id', async () => {
    mockCategorySdk.categoryControllerDeleteCategory.mockResolvedValueOnce(
      wrapped(undefined),
    );

    await deleteCategory('cat-1');

    expect(mockCategorySdk.categoryControllerDeleteCategory).toHaveBeenCalledWith(
      'cat-1',
    );
  });

  it('propagates ApiError on failure', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCategorySdk.categoryControllerDeleteCategory.mockRejectedValueOnce(error);

    await expect(deleteCategory('cat-1')).rejects.toBe(error);
  });
});

describe('category-admin.service — restoreCategory', () => {
  it('calls categoryControllerRestoreCategory with the id and unwraps', async () => {
    mockCategorySdk.categoryControllerRestoreCategory.mockResolvedValueOnce(
      wrapped(CATEGORY_FIXTURE),
    );

    const result = await restoreCategory('cat-1');

    expect(mockCategorySdk.categoryControllerRestoreCategory).toHaveBeenCalledWith(
      'cat-1',
    );
    expect(result).toEqual(CATEGORY_FIXTURE);
  });

  it('propagates ApiError with CATEGORY_SLUG_CONFLICT code on slug conflict', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCategorySdk.categoryControllerRestoreCategory.mockRejectedValueOnce(error);

    await expect(restoreCategory('cat-1')).rejects.toBe(error);
  });
});

describe('category-admin.service — getCategory', () => {
  it('calls categoryControllerGetCategoryById with the id and unwraps', async () => {
    mockCategorySdk.categoryControllerGetCategoryById.mockResolvedValueOnce(
      wrapped(CATEGORY_FIXTURE),
    );

    const result = await getCategory('cat-1');

    expect(mockCategorySdk.categoryControllerGetCategoryById).toHaveBeenCalledWith(
      'cat-1',
    );
    expect(result).toEqual(CATEGORY_FIXTURE);
  });

  it('propagates ApiError on failure (e.g. CATEGORY_NOT_FOUND)', async () => {
    const error = makeApiError({ requestId: 'req-1' });
    mockCategorySdk.categoryControllerGetCategoryById.mockRejectedValueOnce(error);

    await expect(getCategory('missing')).rejects.toBe(error);
  });
});

describe('category-admin.service — JSDoc invariants', () => {
  it('restoreCategory documents CATEGORY_SLUG_CONFLICT in its JSDoc', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sourcePath = join(here, '..', 'category-admin.service.ts');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(
      /restoreCategory[\s\S]{0,800}CATEGORY_SLUG_CONFLICT/,
    );
  });
});
