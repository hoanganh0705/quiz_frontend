/**
 * `__tests__/tag-cache-keys.spec.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.G1.
 *
 * Covers the four acceptance bullets:
 *
 *   1. Keys are stable strings (no random IDs).
 *   2. Invalidation helpers exist and call `mutate` on the documented keys.
 *   3. The public-coverging helper matches every `tags:*` key.
 *   4. (Type-check covered by `pnpm type-check`; not re-asserted here.)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScopedMutator } from 'swr';

import {
  TAG_ADMIN_LIST_KEY,
  PUBLIC_TAGS_DIRECTORY_KEY,
  PUBLIC_TAGS_PREFIX,
  tagSlugKey,
  invalidateTagAdminList,
  invalidatePublicTagCaches,
  publicTagsKeyMatcher,
} from '../tag-cache-keys';

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── Key shape ──────────────────────────────────────────────────────────────

describe('tag-cache-keys — key shape', () => {
  it('TAG_ADMIN_LIST_KEY is the documented stable string', () => {
    expect(TAG_ADMIN_LIST_KEY).toBe('tag-admin:list');
  });

  it('PUBLIC_TAGS_DIRECTORY_KEY is the documented stable string', () => {
    expect(PUBLIC_TAGS_DIRECTORY_KEY).toBe('tags:directory');
  });

  it('PUBLIC_TAGS_PREFIX matches the documented namespace prefix', () => {
    expect(PUBLIC_TAGS_PREFIX).toBe('tags:');
  });

  it('tagSlugKey(slug) produces the documented string form', () => {
    expect(tagSlugKey('javascript')).toBe('tags:slug:javascript');
    expect(tagSlugKey('rust-2024')).toBe('tags:slug:rust-2024');
  });

  it('keys do not change between calls (stable, no random IDs)', () => {
    expect(TAG_ADMIN_LIST_KEY).toBe('tag-admin:list');
    expect(PUBLIC_TAGS_DIRECTORY_KEY).toBe('tags:directory');
    expect(PUBLIC_TAGS_PREFIX).toBe('tags:');
    expect(tagSlugKey('foo')).toBe(tagSlugKey('foo'));
  });
});

// ─── `invalidateTagAdminList` ──────────────────────────────────────────────

describe('tag-cache-keys — invalidateTagAdminList', () => {
  it('calls mutate on TAG_ADMIN_LIST_KEY when a mutate is supplied', async () => {
    const fakeMutate = vi.fn().mockResolvedValue(undefined) as unknown as ScopedMutator;
    await invalidateTagAdminList(fakeMutate);

    expect(fakeMutate).toHaveBeenCalledTimes(1);
    expect(fakeMutate).toHaveBeenCalledWith(TAG_ADMIN_LIST_KEY);
  });

  it('returns a promise resolving to the mutate result', async () => {
    const fakeMutate = vi.fn().mockResolvedValue('ok') as unknown as ScopedMutator;
    await expect(invalidateTagAdminList(fakeMutate)).resolves.toBe('ok');
  });
});

// ─── `publicTagsKeyMatcher` — prefix matcher ───────────────────────────────

describe('tag-cache-keys — publicTagsKeyMatcher', () => {
  it('matches the canonical `tags:directory` key', () => {
    expect(publicTagsKeyMatcher(PUBLIC_TAGS_DIRECTORY_KEY)).toBe(true);
  });

  it('matches every `tags:*` string key', () => {
    expect(publicTagsKeyMatcher('tags:directory')).toBe(true);
    expect(publicTagsKeyMatcher('tags:slug:javascript')).toBe(true);
    expect(publicTagsKeyMatcher('tags:related:math')).toBe(true);
    expect(publicTagsKeyMatcher('tags:analytics:foo')).toBe(true);
    expect(publicTagsKeyMatcher('tags:quizzes:bar')).toBe(true);
  });

  it('matches the array-form key used by `useTagsDirectory`', () => {
    expect(publicTagsKeyMatcher(['tags', 'directory', '', { limit: 10 }])).toBe(true);
    expect(publicTagsKeyMatcher(['tags', 'slug', 'javascript'])).toBe(true);
    expect(publicTagsKeyMatcher(['tag', 'javascript'])).toBe(true);
  });

  it('does not match unrelated keys', () => {
    expect(publicTagsKeyMatcher('tag-admin:list')).toBe(false);
    expect(publicTagsKeyMatcher('quizzes:directory')).toBe(false);
    expect(publicTagsKeyMatcher(['tag-admin', 'list'])).toBe(false);
    expect(publicTagsKeyMatcher(['quizzes', 'directory'])).toBe(false);
    expect(publicTagsKeyMatcher(undefined)).toBe(false);
    expect(publicTagsKeyMatcher(null)).toBe(false);
    expect(publicTagsKeyMatcher(42)).toBe(false);
    expect(publicTagsKeyMatcher({})).toBe(false);
  });
});

// ─── `invalidatePublicTagCaches` ───────────────────────────────────────────

describe('tag-cache-keys — invalidatePublicTagCaches', () => {
  it('returns a promise and calls mutate with a matcher function', async () => {
    const fakeMutate = vi.fn().mockResolvedValue([]) as unknown as ScopedMutator;
    const result = await invalidatePublicTagCaches(fakeMutate);

    expect(fakeMutate).toHaveBeenCalledTimes(1);
    const matcher = (fakeMutate as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0]?.[0];
    expect(typeof matcher).toBe('function');
    expect(result).toEqual([]);
  });

  it('passes through the mutate result', async () => {
    const fakeMutate = vi
      .fn()
      .mockResolvedValue(['entry-1', 'entry-2']) as unknown as ScopedMutator;
    await expect(invalidatePublicTagCaches(fakeMutate)).resolves.toEqual([
      'entry-1',
      'entry-2',
    ]);
  });
});
