

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TagAdminListItem } from '../tag-types';
import { useTagSlugAvailability } from '../useTagSlugAvailability';

const ITEMS: TagAdminListItem[] = [
{
tagId: 'tag-1',
name: 'JavaScript',
slug: 'javascript',
createdAt: '2024-01-01T00:00:00.000Z',
updatedAt: '2024-01-01T00:00:00.000Z',
deletedAt: null,
  },
{
tagId: 'tag-2',
name: 'TypeScript',
slug: 'typescript',
createdAt: '2024-01-01T00:00:00.000Z',
updatedAt: '2024-01-01T00:00:00.000Z',
deletedAt: null,
  },
];

const mockUseDebouncedValue = vi.hoisted(
() => (v: string) => ({ debouncedValue: v, cancel: () => undefined }),
);

vi.mock('@/lib/utils/use-debounced-value', () => ({
useDebouncedValue: mockUseDebouncedValue,
}));

vi.mock('../useTagAdminList', () => ({
useTagAdminList: () => ({ all: ITEMS }),
}));

describe('useTagSlugAvailability', () => {
it('returns unknown for empty slug', () => {
const { result } = renderHook(() => useTagSlugAvailability(''));
expect(result.current.status).toBe('unknown');
expect(result.current.conflictingTag).toBeNull();
  });

it('returns invalid for a slug that fails the regex', () => {

const { result } = renderHook(() => useTagSlugAvailability('JAVASCRIPT'));
expect(result.current.status).toBe('invalid');
expect(result.current.conflictingTag).toBeNull();
  });

it('returns taken when slug is in the list', () => {
const { result } = renderHook(() => useTagSlugAvailability('javascript'));
expect(result.current.status).toBe('taken');
expect(result.current.conflictingTag).not.toBeNull();
expect(result.current.conflictingTag!.name).toBe('JavaScript');
  });

it('returns available when slug is valid and not taken', () => {
const { result } = renderHook(() => useTagSlugAvailability('rust-lang'));
expect(result.current.status).toBe('available');
expect(result.current.conflictingTag).toBeNull();
  });

it('excludes the specified tag id (self-editing)', () => {

const { result } = renderHook(() =>
useTagSlugAvailability('javascript', 'tag-1'),
    );
expect(result.current.status).toBe('available');
  });

it('is case-insensitive', () => {

const { result } = renderHook(() => useTagSlugAvailability('javascript'));
expect(result.current.status).toBe('taken');
  });
});
