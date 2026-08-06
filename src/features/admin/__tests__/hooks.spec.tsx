import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({
    currentUser: null,
    isLoading: false,
    error: null,
  }),
}));

import { useTypedConfirm } from '../hooks/useTypedConfirm';
import { resolveAdminPermissions } from '../hooks/useAdminRole';

describe('admin/hooks — useTypedConfirm', () => {
  it('(1) exposes the canonical confirm string for ranking.reset', () => {
    const { result } = renderHook(() => useTypedConfirm('ranking.reset'));
    expect(result.current.confirmString).toBe('RESET RANKING PERIOD');
    expect(result.current.input).toBe('');
    expect(result.current.matches).toBe(false);
    expect(result.current.hasInput).toBe(false);
    expect(result.current.isFullyValid).toBe(false);
  });

  it('(2) flip matches when input equals confirmString exactly', () => {
    const { result } = renderHook(() => useTypedConfirm('ranking.reset'));
    act(() => {
      result.current.setInput('RESET RANKING PERIOD');
    });
    expect(result.current.matches).toBe(true);
    expect(result.current.hasInput).toBe(true);
    expect(result.current.isFullyValid).toBe(true);
  });

  it('(3) case-sensitivity: lowercase input does not match', () => {
    const { result } = renderHook(() => useTypedConfirm('ranking.reset'));
    act(() => {
      result.current.setInput('reset ranking period');
    });
    expect(result.current.matches).toBe(false);
    expect(result.current.isFullyValid).toBe(false);
  });

  it('(4) assertedConfirm throws until the input matches', () => {
    const { result } = renderHook(() => useTypedConfirm('ranking.reset'));
    expect(() => result.current.assertedConfirm()).toThrow();
    act(() => {
      result.current.setInput('RESET RANKING PERIOD');
    });
    expect(result.current.assertedConfirm()).toBe('RESET RANKING PERIOD');
  });

  it('(5) reset clears the input', () => {
    const { result } = renderHook(() => useTypedConfirm('role.grant'));
    act(() => {
      result.current.setInput('GRANT ROLE');
    });
    expect(result.current.input).toBe('GRANT ROLE');
    act(() => {
      result.current.reset();
    });
    expect(result.current.input).toBe('');
    expect(result.current.matches).toBe(false);
  });
});

describe('admin/hooks — useAdminRole resolution helpers', () => {
  it('role=null returns no permissions', () => {
    expect(resolveAdminPermissions(null)).toEqual([]);
  });

  it('role="admin" returns every Phase 7 admin permission', () => {
    const perms = resolveAdminPermissions('admin');
    expect(perms).toContain('user_grant_role');
    expect(perms).toContain('ranking_reset');
    expect(perms.length).toBeGreaterThan(15);
  });

  it('role="moderator" returns only moderation permissions', () => {
    const perms = resolveAdminPermissions('moderator');
    expect(perms).toContain('review_report_read');
    expect(perms).toContain('comment_hide');
    expect(perms).not.toContain('user_grant_role');
    expect(perms).not.toContain('ranking_reset');
  });

  it('role="user" returns no permissions', () => {
    expect(resolveAdminPermissions('user')).toEqual([]);
  });
});
