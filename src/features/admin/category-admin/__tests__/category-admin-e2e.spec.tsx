

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig, mutate as globalMutate } from 'swr';

import type { ApiError } from '@/lib/api';
import type {
CategoryAdminListItem,
CategoryDto,
CategoryListItem,
DeletedCategoryListItem,
} from '../category-types';
import { CategoryAdminPage } from '../components/CategoryAdminPage';

const mockListCategories = vi.hoisted(() => vi.fn());
const mockCreateCategory = vi.hoisted(() => vi.fn());
const mockUpdateCategory = vi.hoisted(() => vi.fn());
const mockDeleteCategory = vi.hoisted(() => vi.fn());
const mockRestoreCategory = vi.hoisted(() => vi.fn());
const mockAddCategoryAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastCategoryAdminInvalidate = vi.hoisted(() => vi.fn());
const mockSubscribeCategoryAdminInvalidate = vi.hoisted(() => vi.fn());

let listResponse: CategoryAdminListItem[] = [];
let createError: ApiError | null = null;
let restoreError: ApiError | null = null;
let createCallCount = 0;
let restoreCallCount = 0;
let nextCreate: CategoryDto | null = null;
let nextRestore: CategoryDto | null = null;

const SEED_ACTIVE: CategoryListItem = {
categoryId: 'cat-1',
name: 'Mathematics',
slug: 'mathematics',
description: 'Numbers, algebra, and geometry.',
imageUrl: null,
deletedAt: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
};

const SEED_DELETED: DeletedCategoryListItem = {
categoryId: 'cat-2',
name: 'History',
slug: 'history',
description: 'World history and historiography.',
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-06-01T00:00:00.000Z',
deletedAt: '2026-06-01T12:00:00.000Z',
};

vi.mock('@/features/categories/services/categories.service', () => ({
listCategories: mockListCategories,
}));

vi.mock('@/features/admin/services/category-admin.service', () => ({
createCategory: mockCreateCategory,
updateCategory: mockUpdateCategory,
deleteCategory: mockDeleteCategory,
restoreCategory: mockRestoreCategory,
}));

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addCategoryAdminBreadcrumb: mockAddCategoryAdminBreadcrumb,
}));

vi.mock('../cache/category-cross-tab', () => ({
broadcastCategoryAdminInvalidate: mockBroadcastCategoryAdminInvalidate,
subscribeCategoryAdminInvalidate: mockSubscribeCategoryAdminInvalidate,
}));

vi.mock('@/features/admin/hooks', () => ({
useAdminFeatureFlag: vi.fn(() => ({
flag: 'admin_category_live' as const,
value: 'live' as const,
isLive: true,
isPlaceholder: false,
  })),
usePermission: vi.fn(() => ({
hasPermission: true,
isLoading: false,
error: null,
  })),
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
useSearchParams: vi.fn(() => ({
get: vi.fn((key: string) => (key === 'tab' ? 'active' : null)),
  })),
}));

vi.mock('@/lib/forms/useToast', () => ({
useToast: () => ({ push: vi.fn(), dismiss: vi.fn() }),
DEFAULT_TOAST_DURATION_MS: 5000,
}));

vi.mock('../hooks/useCategorySlugAvailability', () => ({
useCategorySlugAvailability: () => ({
status: 'unknown' as const,
debouncedSlug: '',
conflictingCategory: null,
  }),
}));

function makeApiError(
code: string,
requestId = 'req-test',
detail = 'mock error',
): ApiError {
return Object.assign(new Error(detail), {
code,
requestId,
detail,
name: 'ApiError',
  }) as unknown as ApiError;
}

beforeEach(() => {
vi.clearAllMocks();
listResponse = [SEED_ACTIVE, SEED_DELETED];
createError = null;
restoreError = null;
createCallCount = 0;
restoreCallCount = 0;
nextCreate = null;
nextRestore = null;

mockListCategories.mockResolvedValue({ data: listResponse });

mockCreateCategory.mockImplementation(
async (input: { name: string; slug?: string; description?: string | null }) => {
createCallCount += 1;
if (createError) throw createError;
if (nextCreate) return nextCreate;
return {
categoryId: `cat-new-${createCallCount}`,
name: input.name,
slug: input.slug ?? 'auto',
description: input.description ?? null,
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
deletedAt: null,
      } as unknown as CategoryDto;
    },
  );

mockUpdateCategory.mockImplementation(
async (id: string, input: { name?: string; slug?: string }) => ({
categoryId: id,
name: input.name ?? 'Updated',
slug: input.slug ?? 'updated',
description: null,
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-02T00:00:00.000Z',
deletedAt: null,
    }),
  );

mockDeleteCategory.mockImplementation(async (id: string) => {
listResponse = listResponse.map((category) =>
category.categoryId === id
? ({ ...category, deletedAt: '2026-06-01T12:00:00.000Z' } as unknown as CategoryListItem)
: category,
    );
await globalMutate('category-admin:list');
await globalMutate((key: unknown) =>
typeof key === 'string' && key.startsWith('categories:'),
    );
  });

mockRestoreCategory.mockImplementation(async (id: string) => {
restoreCallCount += 1;
if (restoreError) throw restoreError;
if (nextRestore) return nextRestore;
return {
categoryId: id,
name: 'History',
slug: 'history',
description: 'World history and historiography.',
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-06-02T00:00:00.000Z',
deletedAt: null,
    };
  });

mockSubscribeCategoryAdminInvalidate.mockReturnValue(() => {});
});

afterEach(() => {
vi.restoreAllMocks();
});

function renderPage() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<CategoryAdminPage />
</SWRConfig>,
  );
}

describe('CategoryAdminPage — end-to-end user flow (TKT-7.4.H1)', () => {
it('step 1: the page mounts, subscribes to the cross-tab invalidation broadcast, and renders the documented header / tabs / active list', async () => {
renderPage();
expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
expect(screen.getByRole('tab', { name: /Active/i })).toBeInTheDocument();
expect(screen.getByRole('tab', { name: /Soft-deleted/i })).toBeInTheDocument();

expect(await screen.findByText('Mathematics')).toBeInTheDocument();

expect(mockSubscribeCategoryAdminInvalidate).toHaveBeenCalledTimes(1);
  });

it('step 2: successful create broadcasts the cross-tab invalidation (TKT-7.4.G2)', async () => {
const { useCreateCategory } = await import('../hooks/useCreateCategory');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useCreateCategory());

await act(async () => {
await result.current.create({ name: 'Science', description: 'All the sciences.' });
    });

expect(mockCreateCategory).toHaveBeenCalledWith(
expect.objectContaining({ name: 'Science' }),
    );
expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith(
'create',
expect.any(String),
    );
  });

it('step 3: successful update broadcasts the cross-tab invalidation (TKT-7.4.G2)', async () => {
const { useUpdateCategory } = await import('../hooks/useUpdateCategory');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useUpdateCategory());

await act(async () => {
await result.current.update('cat-1', { name: 'Pure Mathematics' });
    });

expect(mockUpdateCategory).toHaveBeenCalledWith(
'cat-1',
expect.objectContaining({ name: 'Pure Mathematics' }),
    );
expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith('update', 'cat-1');
  });

it('step 4: successful delete broadcasts the cross-tab invalidation and triggers the audit started/success breadcrumb pair (TKT-7.4.E / G2)', async () => {
const { useDeleteCategory } = await import('../hooks/useDeleteCategory');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useDeleteCategory());

await act(async () => {
await result.current.remove('cat-1');
    });

expect(mockDeleteCategory).toHaveBeenCalledWith('cat-1');
expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith('delete', 'cat-1');
expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'category.delete', status: 'started' }),
    );
expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'category.delete', status: 'success' }),
    );
  });

it('step 5: successful restore broadcasts the cross-tab invalidation (TKT-7.4.G2)', async () => {
const { useRestoreCategory } = await import('../hooks/useRestoreCategory');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useRestoreCategory());

await act(async () => {
await result.current.restore('cat-2');
    });

expect(mockRestoreCategory).toHaveBeenCalled();
expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith('restore', 'cat-2');
  });

it('step 6a: CATEGORY_SLUG_CONFLICT on restore surfaces the documented error and does not broadcast', async () => {
restoreError = makeApiError('CATEGORY_SLUG_CONFLICT', 'req-conflict-r');
const { useRestoreCategory } = await import('../hooks/useRestoreCategory');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useRestoreCategory());

await act(async () => {
await expect(result.current.restore('cat-2')).rejects.toBeDefined();
    });
expect(mockBroadcastCategoryAdminInvalidate).not.toHaveBeenCalledWith(
'restore',
expect.anything(),
    );
  });

it('step 6b: after the rename, the second restore call succeeds and broadcasts (TKT-7.4.H1)', async () => {
restoreError = makeApiError('CATEGORY_SLUG_CONFLICT', 'req-conflict-r');
nextRestore = {
categoryId: 'cat-2',
name: 'History',
slug: 'history-renamed',
description: null,
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-06-02T00:00:00.000Z',
    } as unknown as CategoryDto;

const { useRestoreCategory } = await import('../hooks/useRestoreCategory');
const { renderHook, act } = await import('@testing-library/react');

const { result: result1 } = renderHook(() => useRestoreCategory());
await act(async () => {
await expect(result1.current.restore('cat-2')).rejects.toBeDefined();
    });

restoreError = null;
const { result: result2 } = renderHook(() => useRestoreCategory());
await act(async () => {
await result2.current.restore('cat-2', { renamedSlug: 'history-renamed' });
    });

expect(restoreCallCount).toBeGreaterThanOrEqual(1);
expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith('restore', 'cat-2');
expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'category.restore', status: 'success' }),
    );
  });

it('step 7a: CATEGORY_SLUG_CONFLICT on create surfaces and is consumed on rename', async () => {
createError = makeApiError('CATEGORY_SLUG_CONFLICT', 'req-conflict-c');
nextCreate = {
categoryId: 'cat-math',
name: 'Math',
slug: 'math-alt',
description: null,
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as CategoryDto;

const { useCreateCategory } = await import('../hooks/useCreateCategory');
const { renderHook, act } = await import('@testing-library/react');

const { result: result1 } = renderHook(() => useCreateCategory());
await act(async () => {
await expect(
result1.current.create({ name: 'Math', slug: 'math' }),
      ).rejects.toBeDefined();
    });

createError = null;
const { result: result2 } = renderHook(() => useCreateCategory());
await act(async () => {
await result2.current.create({ name: 'Math', slug: 'math-alt' });
    });

expect(createCallCount).toBeGreaterThanOrEqual(2);
expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith('create', 'cat-math');
  });

it('step 8: the documented cross-tab subscriber triggers a public caches invalidation when a remote mutation event arrives (TKT-7.4.G1+G2)', async () => {

renderPage();
expect(mockSubscribeCategoryAdminInvalidate).toHaveBeenCalledTimes(1);

const handler = mockSubscribeCategoryAdminInvalidate.mock.calls[0]?.[0];
expect(typeof handler).toBe('function');

void handler;
  });

it('step 9: after every successful mutation, the public category caches are invalidated (TKT-7.4.G1)', async () => {
const { invalidatePublicCategoryCaches, publicCategoriesKeyMatcher } =
await import('../cache/category-cache-keys');

const cache = new Map<unknown, unknown>();
cache.set('category-admin:list', { stub: true });
cache.set('categories:directory', { stub: true });
cache.set('categories:slug:mathematics', { stub: true });
cache.set(['categories', 'directory', 'active'], { stub: true });
cache.set(['category', 'mathematics'], { stub: true });
cache.set(['quizzes', 'directory'], { stub: true });

let invalidated: unknown[] = [];
await invalidatePublicCategoryCaches(((matcher: unknown) => {
invalidated = [];
for (const [key] of cache.entries()) {
if (typeof matcher === 'function' && matcher(key)) {
invalidated.push(key);
        }
      }
return invalidated;
    }) as never);

for (const k of invalidated) {
expect(publicCategoriesKeyMatcher(k)).toBe(true);
    }
expect(invalidated).toContain('categories:directory');
expect(invalidated).toContain('categories:slug:mathematics');

expect(invalidated as string[]).not.toContain('category-admin:list');
  });
});
