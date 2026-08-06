/**
 * `features/admin/category-admin/__tests__/category-types.spec.ts`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.B1.
 *
 * Validates the discriminated union shape and the re-exports.
 *
 * Pure-TypeScript spec; runs in the node project (no jsdom required).
 */

import { describe, expect, it } from 'vitest';

import type {
  CategoryCreateDto,
  CategoryUpdateDto,
  CategoryRestoreResponseDto,
  CategoryListItem,
  DeletedCategoryListItem,
  CategoryAdminListItem,
  CategoryDto,
} from '../category-types';

describe('category-types re-exports', () => {
  it('CategoryCreateDto has required name and optional slug/description/imageUrl', () => {
    const valid: CategoryCreateDto = { name: 'Science' };
    const withSlug: CategoryCreateDto = {
      name: 'Science',
      slug: 'science',
    };
    const full: CategoryCreateDto = {
      name: 'Science',
      slug: 'science',
      description: 'Natural sciences',
      imageUrl: 'https://example.com/sci.png',
    };
    expect(valid).toBeDefined();
    expect(withSlug).toBeDefined();
    expect(full).toBeDefined();
  });

  it('CategoryCreateDto accepts nullable description and imageUrl', () => {
    const withNullDescription: CategoryCreateDto = {
      name: 'Math',
      description: null,
    };
    const withNullImageUrl: CategoryCreateDto = {
      name: 'Math',
      imageUrl: null,
    };
    expect(withNullDescription).toBeDefined();
    expect(withNullImageUrl).toBeDefined();
  });

  it('CategoryUpdateDto has all fields optional', () => {
    const empty: CategoryUpdateDto = {};
    const nameOnly: CategoryUpdateDto = { name: 'Mathematics' };
    const slugOnly: CategoryUpdateDto = { slug: 'mathematics' };
    const allFields: CategoryUpdateDto = {
      name: 'Mathematics',
      slug: 'mathematics',
      description: 'The queen of sciences',
      imageUrl: 'https://example.com/math.png',
    };
    expect(empty).toBeDefined();
    expect(nameOnly).toBeDefined();
    expect(slugOnly).toBeDefined();
    expect(allFields).toBeDefined();
  });

  it('CategoryRestoreResponseDto has all required fields', () => {
    const dto: CategoryRestoreResponseDto = {
      categoryId: 'cat-1',
      name: 'Restored',
      slug: 'restored',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    expect(dto.categoryId).toBe('cat-1');
  });

  it('CategoryDto is defined and has required fields', () => {
    const dto: CategoryDto = {
      categoryId: 'cat-2',
      name: 'Algebra',
      slug: 'algebra',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    expect(dto.categoryId).toBe('cat-2');
  });

  it('CategoryDto accepts optional description and imageUrl', () => {
    const dto: CategoryDto = {
      categoryId: 'cat-3',
      name: 'Geometry',
      slug: 'geometry',
      description: 'Study of shapes',
      imageUrl: 'https://example.com/geometry.png',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    expect(dto.description).toBe('Study of shapes');
    expect(dto.imageUrl).toBe('https://example.com/geometry.png');
  });
});

describe('discriminated union — CategoryListItem', () => {
  it('requires deletedAt to be null', () => {
    const active: CategoryListItem = {
      categoryId: 'cat-1',
      name: 'Active Category',
      slug: 'active-category',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
    };
    expect(active.deletedAt).toBeNull();
  });

  it('preserves optional description and imageUrl fields', () => {
    const active: CategoryListItem = {
      categoryId: 'cat-1',
      name: 'Active',
      slug: 'active',
      description: 'A live category',
      imageUrl: 'https://example.com/cat.png',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
    };
    expect(active.description).toBe('A live category');
    expect(active.imageUrl).toBe('https://example.com/cat.png');
  });

  it('is assignable to CategoryAdminListItem', () => {
    const active: CategoryListItem = {
      categoryId: 'cat-1',
      name: 'Active',
      slug: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
    };
    const asUnion: CategoryAdminListItem = active;
    expect(asUnion).toBeDefined();
  });
});

describe('discriminated union — DeletedCategoryListItem', () => {
  it('requires deletedAt to be an ISO 8601 string', () => {
    const deleted: DeletedCategoryListItem = {
      categoryId: 'cat-2',
      name: 'Deleted Category',
      slug: 'deleted-category',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: '2024-06-01T12:00:00Z',
    };
    expect(deleted.deletedAt).toBe('2024-06-01T12:00:00Z');
  });

  it('preserves optional description and imageUrl fields', () => {
    const deleted: DeletedCategoryListItem = {
      categoryId: 'cat-2',
      name: 'Deleted',
      slug: 'deleted',
      description: 'A retired category',
      imageUrl: 'https://example.com/deleted.png',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: '2024-06-01T12:00:00Z',
    };
    expect(deleted.description).toBe('A retired category');
    expect(deleted.imageUrl).toBe('https://example.com/deleted.png');
  });

  it('is assignable to CategoryAdminListItem', () => {
    const deleted: DeletedCategoryListItem = {
      categoryId: 'cat-2',
      name: 'Deleted',
      slug: 'deleted',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: '2024-06-01T12:00:00Z',
    };
    const asUnion: CategoryAdminListItem = deleted;
    expect(asUnion).toBeDefined();
  });
});

describe('discriminated union — CategoryAdminListItem', () => {
  it('accepts a CategoryListItem', () => {
    const active: CategoryListItem = {
      categoryId: 'cat-1',
      name: 'Math',
      slug: 'math',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
    };
    const item: CategoryAdminListItem = active;
    expect(item).toBeDefined();
  });

  it('accepts a DeletedCategoryListItem', () => {
    const deleted: DeletedCategoryListItem = {
      categoryId: 'cat-2',
      name: 'Old Category',
      slug: 'old-category',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: '2024-06-01T12:00:00Z',
    };
    const item: CategoryAdminListItem = deleted;
    expect(item).toBeDefined();
  });

  it('discriminator guard — null → active', () => {
    const item: CategoryAdminListItem = {
      categoryId: 'cat-1',
      name: 'Active',
      slug: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
    };
    expect(item.deletedAt === null).toBe(true);
  });

  it('discriminator guard — string → deleted', () => {
    const item: CategoryAdminListItem = {
      categoryId: 'cat-2',
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