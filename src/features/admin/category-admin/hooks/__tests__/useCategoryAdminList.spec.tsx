

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { useCategoryAdminList } from '../useCategoryAdminList';

const mockListCategories = vi.hoisted(() => vi.fn());

vi.mock('@/features/categories/services/categories.service', () => ({
listCategories: (...args: unknown[]) => mockListCategories(...args),
}));

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
mockListCategories.mockReset();
});

function makeCategory(overrides: Record<string, unknown> = {}): Record<string, unknown> {
return {
categoryId: 'cat-1',
name: 'Mathematics',
description: 'Math category',
slug: 'mathematics',
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
deletedAt: null,
...overrides,
  };
}

describe('useCategoryAdminList', () => {
const render = () =>
renderHook(() => useCategoryAdminList(), {
wrapper: ({ children }) => (
<SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      ),
    });

it('exposes empty arrays while loading', () => {
mockListCategories.mockReturnValue(new Promise(() => undefined));

const { result } = render();

expect(result.current.isLoading).toBe(true);
expect(result.current.active).toEqual([]);
expect(result.current.softDeleted).toEqual([]);
expect(result.current.all).toEqual([]);
expect(result.current.error).toBeNull();
  });

it('splits active and soft-deleted rows by deletedAt', async () => {
mockListCategories.mockResolvedValue({
data: [
makeCategory({
categoryId: 'cat-1',
name: 'Mathematics',
slug: 'mathematics',
deletedAt: null,
        }),
makeCategory({
categoryId: 'cat-2',
name: 'Science',
slug: 'science',
deletedAt: null,
        }),
makeCategory({
categoryId: 'cat-deleted',
name: 'Archived',
slug: 'archived',
deletedAt: '2026-02-01T00:00:00.000Z',
        }),
      ],
    });

const { result } = render();

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.active.map((c) => c.categoryId)).toEqual([
'cat-1',
'cat-2',
    ]);
expect(result.current.softDeleted.map((c) => c.categoryId)).toEqual([
'cat-deleted',
    ]);
expect(result.current.all.map((c) => c.categoryId)).toEqual([
'cat-1',
'cat-2',
'cat-deleted',
    ]);
expect(result.current.error).toBeNull();
  });

it('treats rows with null deletedAt as active', async () => {
mockListCategories.mockResolvedValue({
data: [
makeCategory({ categoryId: 'cat-1', deletedAt: null }),
makeCategory({ categoryId: 'cat-2', deletedAt: null }),
      ],
    });

const { result } = render();

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.active).toHaveLength(2);
expect(result.current.softDeleted).toHaveLength(0);
  });

it('surfaces an error when the request fails', async () => {

mockListCategories.mockRejectedValue(
Object.assign(new Error('network failure'), { code: 'NETWORK_ERROR' }),
    );

const { result } = render();

await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });

expect(result.current.active).toEqual([]);
expect(result.current.softDeleted).toEqual([]);
expect(result.current.all).toEqual([]);
  });
});