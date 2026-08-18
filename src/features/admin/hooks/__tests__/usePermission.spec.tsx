

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockUseAdminRole = vi.fn();

vi.mock('@/features/admin/hooks/useAdminRole', () => ({
useAdminRole: () => mockUseAdminRole(),
}));

import { usePermission } from '@/features/admin/hooks/usePermission';

afterEach(() => {
mockUseAdminRole.mockReset();
});

describe('admin/hooks — usePermission', () => {
it('returns hasPermission=true when the role document includes the permission', () => {
mockUseAdminRole.mockReturnValue({
role: 'admin',
permissions: ['tag_create', 'tag_update', 'tag_delete'],
isLoading: false,
error: null,
    });

const { result } = renderHook(() => usePermission('tag_create'));

expect(result.current).toEqual({
hasPermission: true,
isLoading: false,
error: null,
    });
  });

it('returns hasPermission=false when the role document omits the permission', () => {
mockUseAdminRole.mockReturnValue({
role: 'moderator',
permissions: ['review_report_read', 'comment_hide'],
isLoading: false,
error: null,
    });

const { result } = renderHook(() => usePermission('tag_create'));

expect(result.current.hasPermission).toBe(false);
expect(result.current.isLoading).toBe(false);
expect(result.current.error).toBeNull();
  });

it('propagates the loading flag while the role is hydrating', () => {
mockUseAdminRole.mockReturnValue({
role: null,
permissions: [],
isLoading: true,
error: null,
    });

const { result } = renderHook(() => usePermission('user_grant_role'));

expect(result.current.isLoading).toBe(true);
expect(result.current.hasPermission).toBe(false);
expect(result.current.error).toBeNull();
  });

it('propagates the error from useAdminRole when the role fetch fails', () => {
const error = new Error('boom');
mockUseAdminRole.mockReturnValue({
role: null,
permissions: [],
isLoading: false,
error,
    });

const { result } = renderHook(() => usePermission('user_grant_role'));

expect(result.current.error).toBe(error);
expect(result.current.hasPermission).toBe(false);
expect(result.current.isLoading).toBe(false);
  });
});