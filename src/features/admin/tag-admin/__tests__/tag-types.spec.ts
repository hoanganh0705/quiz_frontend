

import { describe, expect, it } from 'vitest';

import type {
TagCreateDto,
TagUpdateDto,
TagRestoreResponseDto,
TagListItem,
DeletedTagListItem,
TagAdminListItem,
TagDto,
} from '../tag-types';

describe('tag-types re-exports', () => {
it('TagCreateDto has required name and optional slug', () => {
const valid: TagCreateDto = { name: 'JavaScript' };
const withSlug: TagCreateDto = { name: 'JavaScript', slug: 'javascript' };
expect(valid).toBeDefined();
expect(withSlug).toBeDefined();
  });

it('TagUpdateDto has optional name and optional slug', () => {
const empty: TagUpdateDto = {};
const nameOnly: TagUpdateDto = { name: 'TypeScript' };
const slugOnly: TagUpdateDto = { slug: 'typescript' };
const both: TagUpdateDto = { name: 'TypeScript', slug: 'typescript' };
expect(empty).toBeDefined();
expect(nameOnly).toBeDefined();
expect(slugOnly).toBeDefined();
expect(both).toBeDefined();
  });

it('TagRestoreResponseDto has all required fields', () => {
const dto: TagRestoreResponseDto = {
tagId: '123',
name: 'Restored',
slug: 'restored',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-02T00:00:00Z',
    };
expect(dto.tagId).toBe('123');
  });

it('TagDto is defined and has required fields', () => {
const dto: TagDto = {
tagId: '456',
name: 'Algebra',
slug: 'algebra',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-02T00:00:00Z',
    };
expect(dto.tagId).toBe('456');
  });
});

describe('discriminated union — TagListItem', () => {
it('requires deletedAt to be null', () => {
const active: TagListItem = {
tagId: '1',
name: 'Active Tag',
slug: 'active-tag',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: null,
    };
expect(active.deletedAt).toBeNull();
  });

it('rejects deletedAt as a string', () => {

const active: TagListItem = {
tagId: '1',
name: 'Active Tag',
slug: 'active-tag',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: null,
    };
expect(active.deletedAt).toBeNull();
  });

it('is assignable to TagAdminListItem', () => {
const active: TagListItem = {
tagId: '1',
name: 'Active Tag',
slug: 'active-tag',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: null,
    };
const asUnion: TagAdminListItem = active;
expect(asUnion).toBeDefined();
  });
});

describe('discriminated union — DeletedTagListItem', () => {
it('requires deletedAt to be an ISO 8601 string', () => {
const deleted: DeletedTagListItem = {
tagId: '2',
name: 'Deleted Tag',
slug: 'deleted-tag',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: '2024-06-01T12:00:00Z',
    };
expect(deleted.deletedAt).toBe('2024-06-01T12:00:00Z');
  });

it('rejects deletedAt as null', () => {

const deleted: DeletedTagListItem = {
tagId: '2',
name: 'Deleted Tag',
slug: 'deleted-tag',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: '2024-06-01T12:00:00Z',
    };
expect(deleted.deletedAt).not.toBeNull();
  });

it('is assignable to TagAdminListItem', () => {
const deleted: DeletedTagListItem = {
tagId: '2',
name: 'Deleted Tag',
slug: 'deleted-tag',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: '2024-06-01T12:00:00Z',
    };
const asUnion: TagAdminListItem = deleted;
expect(asUnion).toBeDefined();
  });
});

describe('discriminated union — TagAdminListItem', () => {
it('accepts a TagListItem', () => {
const active: TagListItem = {
tagId: '1',
name: 'Math',
slug: 'math',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: null,
    };
const item: TagAdminListItem = active;
expect(item).toBeDefined();
  });

it('accepts a DeletedTagListItem', () => {
const deleted: DeletedTagListItem = {
tagId: '2',
name: 'Old Tag',
slug: 'old-tag',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: '2024-06-01T12:00:00Z',
    };
const item: TagAdminListItem = deleted;
expect(item).toBeDefined();
  });

it('discriminator guard — null → active', () => {
const item: TagAdminListItem = {
tagId: '1',
name: 'Active',
slug: 'active',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: null,
    };
expect(item.deletedAt === null).toBe(true);
  });

it('discriminator guard — string → deleted', () => {
const item: TagAdminListItem = {
tagId: '2',
name: 'Deleted',
slug: 'deleted',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-01-01T00:00:00Z',
deletedAt: '2024-06-01T12:00:00Z',
    };
expect(item.deletedAt !== null).toBe(true);
expect(typeof item.deletedAt).toBe('string');
  });
});
