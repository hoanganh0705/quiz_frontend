

import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockUseSearchParams, mockUseRouter, mockUsePathname } = vi.hoisted(() => ({
mockUseSearchParams: vi.fn(),
mockUseRouter: vi.fn(),
mockUsePathname: vi.fn(),
}));

vi.mock('next/navigation', () => ({
useSearchParams: () => mockUseSearchParams(),
useRouter: () => mockUseRouter(),
usePathname: () => mockUsePathname(),
}));

import { useAuditLogFilters } from '../useAuditLogFilters';

afterEach(() => {
vi.restoreAllMocks();
});

describe('useAuditLogFilters', () => {

it('returns empty filters when URL has no params', () => {
mockUseSearchParams.mockReturnValue(new URLSearchParams());
mockUseRouter.mockReturnValue({ push: vi.fn() });

const { result } = renderHook(() => useAuditLogFilters());

expect(result.current.filters).toEqual({});
expect(result.current.hasActiveFilters).toBe(false);
  });

it('parses actorId from URL params', () => {
mockUseSearchParams.mockReturnValue(
new URLSearchParams('actorId=00000000-0000-4000-8000-000000000001'),
    );
mockUseRouter.mockReturnValue({ push: vi.fn() });

const { result } = renderHook(() => useAuditLogFilters());

expect(result.current.filters.actorId).toBe(
'00000000-0000-4000-8000-000000000001',
    );
expect(result.current.hasActiveFilters).toBe(true);
  });

it('parses action from URL params', () => {
mockUseSearchParams.mockReturnValue(new URLSearchParams('action=role.grant'));
mockUseRouter.mockReturnValue({ push: vi.fn() });

const { result } = renderHook(() => useAuditLogFilters());

expect(result.current.filters.action).toBe('role.grant');
  });

it('parses multiple filters from URL params', () => {
mockUseSearchParams.mockReturnValue(
new URLSearchParams(
'actorId=00000000-0000-4000-8000-000000000001&action=role.grant&targetType=user',
      ),
    );
mockUseRouter.mockReturnValue({ push: vi.fn() });

const { result } = renderHook(() => useAuditLogFilters());

expect(result.current.filters.actorId).toBe(
'00000000-0000-4000-8000-000000000001',
    );
expect(result.current.filters.action).toBe('role.grant');
expect(result.current.filters.targetType).toBe('user');
  });

it('drops invalid actorId (non-UUID)', () => {
mockUseSearchParams.mockReturnValue(
new URLSearchParams('actorId=not-a-uuid'),
    );
mockUseRouter.mockReturnValue({ push: vi.fn() });

const { result } = renderHook(() => useAuditLogFilters());

expect(result.current.filters.actorId).toBeUndefined();
expect(result.current.hasActiveFilters).toBe(false);
  });

it('getFilter returns the correct value for a field', () => {
mockUseSearchParams.mockReturnValue(new URLSearchParams('action=test'));
mockUseRouter.mockReturnValue({ push: vi.fn() });

const { result } = renderHook(() => useAuditLogFilters());

expect(result.current.getFilter('action')).toBe('test');
expect(result.current.getFilter('actorId')).toBeUndefined();
  });

it('setFilter updates URL via router.push', () => {
mockUseSearchParams.mockReturnValue(new URLSearchParams());
const mockPush = vi.fn();
mockUseRouter.mockReturnValue({ push: mockPush });

const { result } = renderHook(() => useAuditLogFilters());

act(() => {
result.current.setFilter('actorId', '00000000-0000-4000-8000-000000000001');
    });

expect(mockPush).toHaveBeenCalled();
const callArgs = mockPush.mock.calls[0];
expect(callArgs[0]).toMatch(/actorId=/);
  });

it('resetFilters navigates to /admin/audit without query string', () => {
mockUseSearchParams.mockReturnValue(new URLSearchParams('action=test'));
const mockPush = vi.fn();
mockUseRouter.mockReturnValue({ push: mockPush });

const { result } = renderHook(() => useAuditLogFilters());

act(() => {
result.current.resetFilters();
    });

expect(mockPush).toHaveBeenCalledWith('/admin/audit', expect.anything());
  });
});