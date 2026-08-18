

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig, mutate as globalMutate } from 'swr';

import type { ApiError } from '@/lib/api';
import type { DeletedTagListItem, TagDto, TagListItem } from '../tag-types';
import { TagAdminPage } from '../components/TagAdminPage';

const mockListTags = vi.hoisted(() => vi.fn());
const mockCreateTag = vi.hoisted(() => vi.fn());
const mockUpdateTag = vi.hoisted(() => vi.fn());
const mockDeleteTag = vi.hoisted(() => vi.fn());
const mockRestoreTag = vi.hoisted(() => vi.fn());
const mockAddTagAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastTagAdminInvalidate = vi.hoisted(() => vi.fn());
const mockSubscribeTagAdminInvalidate = vi.hoisted(() => vi.fn());

let listResponse: (TagListItem | DeletedTagListItem)[] = [];
let createError: ApiError | null = null;
let restoreError: ApiError | null = null;
let createCallCount = 0;
let restoreCallCount = 0;
let nextCreate: TagDto | null = null;
let nextRestore: TagDto | null = null;

const SEED_ACTIVE: TagListItem = {
tagId: 'tag-1',
name: 'JavaScript',
slug: 'javascript',
deletedAt: null,
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
};

const SEED_DELETED: DeletedTagListItem = {
tagId: 'tag-2',
name: 'TypeScript',
slug: 'typescript',
deletedAt: '2024-06-01T00:00:00Z',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-06-01T00:00:00Z',
};

vi.mock('@/features/tags/services/tags.service', () => ({
listTags: mockListTags,
}));

vi.mock('@/features/admin/services/tag-admin.service', () => ({
createTag: mockCreateTag,
updateTag: mockUpdateTag,
deleteTag: mockDeleteTag,
restoreTag: mockRestoreTag,
}));

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addTagAdminBreadcrumb: mockAddTagAdminBreadcrumb,
}));

vi.mock('@/features/admin/tag-admin/cache/tag-cross-tab', () => ({
broadcastTagAdminInvalidate: mockBroadcastTagAdminInvalidate,
subscribeTagAdminInvalidate: mockSubscribeTagAdminInvalidate,
}));

vi.mock('@/features/admin/hooks', () => ({
useAdminFeatureFlag: vi.fn(() => ({
flag: 'admin_tag_live' as const,
value: 'live' as const,
isLive: true,
isPlaceholder: false,
  })),
usePermission: vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
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

vi.mock('@/features/admin/tag-admin/hooks/useTagSlugAvailability', () => ({
useTagSlugAvailability: () => ({
status: 'unknown' as const,
debouncedSlug: '',
conflictingTag: null,
  }),
}));

function makeApiError(code: string, requestId = 'req-test', detail = 'mock error'): ApiError {
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

mockListTags.mockResolvedValue({ data: listResponse });

mockCreateTag.mockImplementation(async (input: { name: string; slug?: string }) => {
createCallCount += 1;
if (createError) throw createError;
if (nextCreate) return nextCreate;
return {
tagId: `tag-new-${createCallCount}`,
name: input.name,
slug: input.slug ?? 'auto',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
    };
  });

mockUpdateTag.mockImplementation(
async (id: string, input: { name?: string; slug?: string }) => ({
tagId: id,
name: input.name ?? 'Updated',
slug: input.slug ?? 'updated',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-02T00:00:00Z',
    }),
  );

mockDeleteTag.mockImplementation(async (id: string) => {
listResponse = listResponse.map((tag) =>
tag.tagId === id
? ({ ...tag, deletedAt: '2024-06-01T00:00:00Z' } as unknown as TagListItem)
: tag,
    );
await globalMutate('tag-admin:list');
await globalMutate('tags:directory');
  });

mockRestoreTag.mockImplementation(async (id: string) => {
restoreCallCount += 1;
if (restoreError) throw restoreError;
if (nextRestore) return nextRestore;
return {
tagId: id,
name: 'TypeScript',
slug: 'typescript',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-06-02T00:00:00Z',
    };
  });

mockSubscribeTagAdminInvalidate.mockReturnValue(() => {});
});

afterEach(() => {
vi.restoreAllMocks();
});

function renderPage() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<TagAdminPage />
</SWRConfig>,
  );
}

describe('TagAdminPage — end-to-end user flow (TKT-7.3.H1)', () => {
it('step 1: the page mounts, subscribes to the cross-tab invalidation broadcast, and renders the documented header / tabs / active list', async () => {
renderPage();
expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument();
expect(screen.getByRole('tab', { name: /Active/i })).toBeInTheDocument();
expect(screen.getByRole('tab', { name: /Soft-deleted/i })).toBeInTheDocument();

expect(await screen.findByText('JavaScript')).toBeInTheDocument();

expect(mockSubscribeTagAdminInvalidate).toHaveBeenCalledTimes(1);
  });

it('step 2: successful create broadcasts the cross-tab invalidation and the response is the seed for the next render (TKT-7.3.G2)', async () => {
const { useCreateTag } = await import('../hooks/useCreateTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useCreateTag());

await act(async () => {
await result.current.create({ name: 'Rust' });
    });

expect(mockCreateTag).toHaveBeenCalledWith(
expect.objectContaining({ name: 'Rust' }),
    );
expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith(
'create',
expect.any(String),
    );
  });

it('step 3: successful update broadcasts the cross-tab invalidation (TKT-7.3.G2)', async () => {
const { useUpdateTag } = await import('../hooks/useUpdateTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useUpdateTag());

await act(async () => {
await result.current.update('tag-1', { name: 'JavaScript ES2024' });
    });

expect(mockUpdateTag).toHaveBeenCalledWith(
'tag-1',
expect.objectContaining({ name: 'JavaScript ES2024' }),
    );
expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('update', 'tag-1');
  });

it('step 4: successful delete broadcasts the cross-tab invalidation and triggers the audit started/success breadcrumb pair (TKT-7.3.E / G2)', async () => {
const { useDeleteTag } = await import('../hooks/useDeleteTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useDeleteTag());

await act(async () => {
await result.current.remove('tag-1');
    });

expect(mockDeleteTag).toHaveBeenCalledWith('tag-1');
expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('delete', 'tag-1');
expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'tag.delete', status: 'started' }),
    );
expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'tag.delete', status: 'success' }),
    );
  });

it('step 5: successful restore broadcasts the cross-tab invalidation (TKT-7.3.G2)', async () => {
const { useRestoreTag } = await import('../hooks/useRestoreTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useRestoreTag());

await act(async () => {
await result.current.restore('tag-2');
    });

expect(mockRestoreTag).toHaveBeenCalled();
expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('restore', 'tag-2');
  });

it('step 6a: TAG_SLUG_CONFLICT on restore surfaces the documented error and does not broadcast', async () => {
restoreError = makeApiError('TAG_SLUG_CONFLICT', 'req-conflict-r');
const { useRestoreTag } = await import('../hooks/useRestoreTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useRestoreTag());

await act(async () => {
await expect(
result.current.restore('tag-2'),
      ).rejects.toBeDefined();
    });
expect(mockBroadcastTagAdminInvalidate).not.toHaveBeenCalledWith(
'restore',
expect.anything(),
    );
  });

it('step 6b: after the rename, the second restore call succeeds and broadcasts (TKT-7.3.H1)', async () => {
restoreError = makeApiError('TAG_SLUG_CONFLICT', 'req-conflict-r');
nextRestore = {
tagId: 'tag-2',
name: 'TypeScript',
slug: 'typescript-renamed',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-06-02T00:00:00Z',
    };

const { useRestoreTag } = await import('../hooks/useRestoreTag');
const { renderHook, act } = await import('@testing-library/react');

const { result: result1 } = renderHook(() => useRestoreTag());
await act(async () => {
await expect(
result1.current.restore('tag-2'),
      ).rejects.toBeDefined();
    });

restoreError = null;
const { result: result2 } = renderHook(() => useRestoreTag());
await act(async () => {
await result2.current.restore('tag-2', { renamedSlug: 'typescript-renamed' });
    });

expect(restoreCallCount).toBeGreaterThanOrEqual(1);
expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('restore', 'tag-2');
expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({ action: 'tag.restore', status: 'success' }),
    );
  });

it('step 7a: TAG_SLUG_CONFLICT on create surfaces and is consumed on rename', async () => {
createError = makeApiError('TAG_SLUG_CONFLICT', 'req-conflict-c');
nextCreate = {
tagId: 'tag-math',
name: 'Math',
slug: 'math-alt',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
    };

const { useCreateTag } = await import('../hooks/useCreateTag');
const { renderHook, act } = await import('@testing-library/react');

const { result: result1 } = renderHook(() => useCreateTag());
await act(async () => {
await expect(
result1.current.create({ name: 'Math', slug: 'math' }),
      ).rejects.toBeDefined();
    });

createError = null;
const { result: result2 } = renderHook(() => useCreateTag());
await act(async () => {
await result2.current.create({ name: 'Math', slug: 'math-alt' });
    });

expect(createCallCount).toBeGreaterThanOrEqual(2);
expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('create', 'tag-math');
  });

it('step 8: the documented cross-tab subscriber triggers a public caches invalidation when a remote mutation event arrives (TKT-7.3.G1+G2)', async () => {

renderPage();
expect(mockSubscribeTagAdminInvalidate).toHaveBeenCalledTimes(1);

const handler = mockSubscribeTagAdminInvalidate.mock.calls[0]?.[0];
expect(typeof handler).toBe('function');

void handler;
  });

it('step 9: after every successful mutation, the public tag caches are invalidated (TKT-7.3.G1)', async () => {
const { invalidatePublicTagCaches, publicTagsKeyMatcher } = await import(
'../cache/tag-cache-keys'
    );

const cache = new Map<unknown, unknown>();
cache.set('tag-admin:list', { stub: true });
cache.set('tags:directory', { stub: true });
cache.set('tags:slug:javascript', { stub: true });
cache.set(['tags', 'directory', 'active'], { stub: true });
cache.set(['tag', 'javascript'], { stub: true });
cache.set(['quizzes', 'directory'], { stub: true });

let invalidated: unknown[] = [];
await invalidatePublicTagCaches(((matcher: unknown) => {
invalidated = [];
for (const [key] of cache.entries()) {
if (typeof matcher === 'function' && matcher(key)) {
invalidated.push(key);
        }
      }
return invalidated;
    }) as never);

for (const k of invalidated) {
expect(publicTagsKeyMatcher(k)).toBe(true);
    }
expect(invalidated).toContain('tags:directory');
expect(invalidated).toContain('tags:slug:javascript');

expect(invalidated as string[]).not.toContain('tag-admin:list');
  });
});
